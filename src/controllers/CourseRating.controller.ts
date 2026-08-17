import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandler from "../middleware/ErrorHandler";
import { ROLES } from "../models/user.model";
import {
  submitRatingService,
  getMyRatingService,
  getCourseRatingsService,
  getCourseRatingsLeaderboardService,
} from "../services/CourseRating.service";

const isValidRating = (n: unknown) =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;

// Employee — POST /courses/:id/rating
export const submitRating = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new ErrorHandler("Please log in", 401));

    const { courseRating, courseFeedback, quizRating, quizFeedback } = req.body;

    if (!isValidRating(courseRating)) {
      return next(new ErrorHandler("courseRating must be an integer between 1 and 5", 400));
    }
    if (!isValidRating(quizRating)) {
      return next(new ErrorHandler("quizRating must be an integer between 1 and 5", 400));
    }

    await submitRatingService(
      req.params.id as string,
      req.user._id,
      {
        courseRating,
        courseFeedback: courseFeedback ? String(courseFeedback).trim().slice(0, 500) : undefined,
        quizRating,
        quizFeedback: quizFeedback ? String(quizFeedback).trim().slice(0, 500) : undefined,
      },
      res,
    );
  },
);

// Employee — GET /courses/:id/rating/me
export const getMyRating = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new ErrorHandler("Please log in", 401));
    await getMyRatingService(req.params.id as string, req.user._id, res);
  },
);

// Admin — GET /courses/:id/ratings
export const getCourseRatings = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can view course ratings", 403));
    }
    await getCourseRatingsService(req.params.id as string, res);
  },
);

// Admin — GET /courses/ratings/leaderboard
export const getRatingsLeaderboard = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can view this", 403));
    }
    await getCourseRatingsLeaderboardService(res);
  },
);