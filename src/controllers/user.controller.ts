import { Request, Response, NextFunction } from "express";


import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";

import cloudinary from "cloudinary";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";


import sendMail from "../utils/sendMail";
import userModel, { IUser } from "../models/user.model";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandler from "../middleware/ErrorHandler";
import { getAllUsersService, getUserById, updateUserRoleService } from "../services/user.service";



require("dotenv").config();



//register user
interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  role:string
}

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password ,role = "user"} = req.body;
      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email is already exist", 400));
      }
      const user: IRegistrationBody = {
        name,
        email,
        password,
        role,
      };
      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;
      const data = { user: { name: user.name }, activationCode };

      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );
      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account.",
          template: "activation-mail.ejs",
          data,
        });
        res.status(201).json({
          success: true,
          message: `Please check your email:${user.email} to activate your account `,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);



interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVITION_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );
  return { token, activationCode };
};

//activate user
interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}
export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
  
      console.log("Request Body:", req.body);

      const { activation_code, activation_token } =
        req.body as IActivationRequest;

    
      if (!activation_token || !activation_code) {
        return next(new ErrorHandler("Activation token and code are required", 400));
      }

      const newUser: {
        user: IUser;
        activationCode: string;
      } = jwt.verify(
        activation_token,
        process.env.ACTIVITION_SECRET as string
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { name, email, password } = newUser.user;

      const existUser = await userModel.findOne({ email });
      if (existUser) {
        return next(new ErrorHandler("Email is already exist", 400));
      }

      const user = await userModel.create({
        name,
        email,
        password,
      });

      res.status(201).json({
        success: true,
      });
    } catch (error: any) {
      console.error("Activation Error:", error);
      return next(new ErrorHandler(error.message || "Something went wrong", 400));
    }
  }
);



//login user
interface ILoginRequest {
  email: string;
  password: string;
}
export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      if (!email || !password) {
        return next(
          new ErrorHandler("Please enter your email and password ", 400)
        );
      }
      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("Invalid email or password", 400));
      }
      const isPasswordMatch = await user.comparePassword(password);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid email or password", 400));
      }
      

      sendToken(user, 200, res);
      user.save();
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//logout user
export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });
      const userId = req.user?._id || "";
      await userModel.findByIdAndDelete(userId);
      res.status(200).json({
        success: true,
        message: "Logged out is successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update access token
export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
     
      const refresh_token = req.cookies.refresh_token as string;
      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      const message = "Could not refresh token";
      if (!decoded) {
        return next(new ErrorHandler(message, 400));
      }

      const user = await userModel.findById(decoded.id);

      if (!user) {
        return next(new ErrorHandler(message, 400));
      }
      const session = user;

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        {
          expiresIn: "5m",
        }
      );

      const refreshToken = jwt.sign(
        {
          id: user._id,
        },
        process.env.REFRESH_TOKEN as string,
        {
          expiresIn: "3d",
        }
      );

      req.user = user;

      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);

     next();
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update user info
interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.body as IUpdateUserInfo;
      const userId = req.user?._id;
      const user = await userModel.findById(userId);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      

      if (name && user) {
        user.name = name;
      }
      await user?.save();
      await userModel.findByIdAndUpdate(userId, user);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//get user Info

export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return next(new ErrorHandler("User not found", 404));
      }
      getUserById(userId.toString(), res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// social auth
interface ISocialAuthBody {
  email: string;
  name: string;
  avatar: string;
}

export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuthBody;
      const user = await userModel.findOne({ email });
      if (!user) {
        const newUser = await userModel.create({
          email,
          name,
          avatar: avatar ? { public_id: "", url: avatar } : undefined,
        });
        sendToken(newUser, 200, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update user password
interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;

      if (!oldPassword || !newPassword) {
        return next(
          new ErrorHandler("Please inter your old and new password", 400)
        );
      }

      const user = await userModel.findById(req.user?._id).select("password");
      if (user?.password === undefined) {
        return next(new ErrorHandler("Invalid user", 400));
      }
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }
      const isPasswordMatch = await user?.comparePassword(oldPassword);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid old password", 400));
      }
      user.password = newPassword;
      await user?.save();

      await userModel.findByIdAndUpdate(req.user?._id, user);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update profile picture

interface IUpdateProfilePicture {
  avatar: string;
}

export const updateProfilePicture = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body;
      const userId = req?.user?._id;
      const user = await userModel.findById(userId);

      if (avatar && user) {
        //if user have an avatar then call this
        if (user?.avatar?.public_id) {
          //first delete the old image
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        } else {
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        }
      }

      await user?.save();

      await userModel.findByIdAndUpdate(userId, { user });

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

        
//get all users === only for admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {

      const userRole = req.user?.role;

      if (userRole !== 'admin') {
        return next(new ErrorHandler("You are not authorized to view all users", 403));
      }
      getAllUsersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update user role == only for admin
export const updateUserRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'admin') {
        return next(new ErrorHandler("You are not authorized to update user roles", 403));
      }
      const { email, role } = req.body;
      const isUserExist = await userModel.findOne({ email });
      if (isUserExist) {
        const id = isUserExist._id.toString();
        updateUserRoleService(res, id, role);
      } else {
        res.status(400).json({
          success: false,
          message: "User Not Found",
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//Delete user === only admin
export const deleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'admin') {
        return next(new ErrorHandler("You are not authorized to delete users", 403));
      }
      const { id } = req.params;
      const user = await userModel.findById(id);
      if (!user) {
        return next(new ErrorHandler("User not founf", 404));
      }
      await user.deleteOne({ id });
      res.status(201).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);


// الوصول إلى المستخدم بناءً على دوره
export const checkUserRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;  // جلب الدور من المستخدم
    if (userRole !== role) {
      return next(new ErrorHandler("You are not authorized", 403));
    }
    next();
  };
};

