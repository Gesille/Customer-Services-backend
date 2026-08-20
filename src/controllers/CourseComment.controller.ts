import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandler from "../middleware/ErrorHandler";
import { ROLES } from "../models/user.model";

import { ICommentAttachment } from "../models/CourseComment.model";
import {
  addCommentService,
  replyToCommentService,
  addThreadMessageService,
  getMyCommentsForCourseService,
  getCourseCommentsService,
  getOpenCommentsService,
} from "../services/CourseComment.service";
import { bufferToDataUri } from "../middleware/upload";
import { uploadToCloudinary } from "../utils/cloudinary";

// Shared helper — routes wire `uploadSingleAttachment` (multer) ahead of these
// controllers, so req.file is populated when the client attached a file.
async function resolveAttachment(req: Request): Promise<ICommentAttachment | undefined> {
  if (!req.file) return undefined;
  const isVideo = req.file.mimetype.startsWith("video/");
  const result = await uploadToCloudinary(
    bufferToDataUri(req.file),
    "comment-attachments",
    isVideo ? "video" : "image",
  );
  return {
    public_id: result.public_id,
    url: result.secure_url,
    resourceType: isVideo ? "video" : "image",
  };
}

// Employee — POST /courses/:id/comments  (multipart/form-data: text, attachment?)
export const addComment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new ErrorHandler("Please log in", 401));

    const text = String(req.body.text || "").trim();
    if (!text) return next(new ErrorHandler("Comment text is required", 400));

    const attachment = await resolveAttachment(req);
    await addCommentService(req.params.id as string, req.user._id, text, res, attachment);
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
    const attachment = await resolveAttachment(req);
    await addThreadMessageService(req.params.commentId as string, req.user._id, authorRole, text, res, attachment);
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

    const attachment = await resolveAttachment(req);
    await replyToCommentService(req.params.commentId as string, req.user._id, text, res, attachment);
  },
);
