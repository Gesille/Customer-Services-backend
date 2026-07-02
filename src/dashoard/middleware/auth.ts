import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncError";

import jwt, { JwtPayload } from "jsonwebtoken";
import userModel from "../models/user.model";
import { updateAccessToken } from "../controllers/user.controller";
import ErrorHandler from "../../shared/middleware/ErrorHandler";



export const isAuthenticated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token as string;

    if (!access_token) {
      return next(
        new ErrorHandler("Please login to access this resource", 400)
      );
    }

    try {
     
      const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload;


      if (decoded.exp && decoded.exp <= Date.now() / 1000) {
        console.log("Access token expired, updating...")
        await updateAccessToken(req, res, next);  
      } else {
     
        const user = await userModel.findById(decoded.id);
        if (!user) {
          return next(new ErrorHandler("User not found", 400));
        }
        req.user = user;
        next();
      }
    } catch (error) {
      console.log("Error verifying token:", error);
      return next(new ErrorHandler("Invalid or expired access token", 400));
    }
  }
);


export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role) {
      return next(new ErrorHandler("User role is not defined", 400));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Role: ${req.user.role} is not allowed to access this resource`,
          403
        )
      );
    }

    next();
  };
};
