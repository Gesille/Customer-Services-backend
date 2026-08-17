import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandler from "../middleware/ErrorHandler";
import { ROLES } from "../models/user.model";
import {
  addCommentService,
    replyToCommentService,
  addThreadMessageService,

  getMyCommentsForCourseService,
  getCourseCommentsService,
  getOpenCommentsService,
} from "../services/CourseComment.service";

// Employee — POST /courses/:id/comments
export const addComment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new ErrorHandler("Please log in", 401));

    const text = String(req.body.text || "").trim();
    if (!text) return next(new ErrorHandler("Comment text is required", 400));

    await addCommentService(req.params.id as string, req.user._id, text, res);
  },
);

// Employee — GET /courses/:id/comments/me
export const getMyCommentsForCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new ErrorHandler("Please log in", 401));
    await getMyCommentsForCourseService(req.params.id as string, req.user._id, res);
  },
);

export const addThreadMessage = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new ErrorHandler("Please log in", 401));
    const text = String(req.body.text || "").trim();
    if (!text) return next(new ErrorHandler("Message text is required", 400));
    const authorRole = req.user.role === ROLES.ADMIN ? "admin" : "employee";
    await addThreadMessageService(req.params.commentId as string, req.user._id, authorRole, text, res);
  },
);

// Admin — GET /courses/:id/comments

export const getCourseComments = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can view all comments", 403));
    }
    await getCourseCommentsService(req.params.id as string, res);
  },
);

// Admin — GET /courses/comments/open  (dashboard inbox, across all courses)
export const getOpenComments = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can view this", 403));
    }
    await getOpenCommentsService(res);
  },
);

// Admin — PATCH /courses/comments/:commentId/reply
export const replyToComment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can reply", 403));
    }

    const text = String(req.body.text || "").trim();
    if (!text) return next(new ErrorHandler("Reply text is required", 400));

    await replyToCommentService(req.params.commentId as string, req.user._id, text, res);
  },
);