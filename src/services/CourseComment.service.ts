import mongoose from "mongoose";
import { Response } from "express";
import CourseCommentModel, { ICommentAttachment } from "../models/CourseComment.model";
import CourseModel from "../models/Course.model";
import AttemptModel from "../models/Attempt.model";
import NotificationModel from "../models/Notification.model";
import userModel, { ROLES } from "../models/user.model";

export const addCommentService = async (
  courseId: string,
  userId: mongoose.Types.ObjectId,
  text: string,
  res: Response,
  attachment?: ICommentAttachment, // NEW
) => {
  const course = await CourseModel.findById(courseId);
  if (!course) return res.status(404).json({ success: false, message: "Course not found" });

  const attempt = await AttemptModel.findOne({ courseId, userId });
  if (!attempt) return res.status(403).json({ success: false, message: "This course is not assigned to you" });

  const now = new Date();
  const comment = await CourseCommentModel.create({
    courseId,
    userId,
    attemptId: attempt._id,
    messages: [{ text, authorId: userId, authorRole: "employee", attachment, createdAt: now, isEdited: false }],
    lastMessageAt: now,
    lastMessageBy: userId,
    status: "open",
  });

  const admins = await userModel.find({ role: ROLES.ADMIN, isActive: true }).select("_id");
  if (admins.length > 0) {
    await NotificationModel.insertMany(
      admins.map((admin) => ({
        userId: admin._id,
        title: "New course comment",
        message: `${course.courseCode}: a learner left a comment.`,
        type: "system",
        relatedCourse: course._id,
        link: `/admin/courses/${course._id}/comments/${comment._id}`,
      })),
    );
  }

  return res.status(201).json({ success: true, comment });
};

export const replyToCommentService = async (
  commentId: string,
  adminId: mongoose.Types.ObjectId,
  text: string,
  res: Response,
  attachment?: ICommentAttachment, // NEW
) => {
  const comment = await CourseCommentModel.findById(commentId);
  if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

  const now = new Date();
  comment.messages.push({
    text,
    authorId: adminId,
    authorRole: "admin",
    attachment,
    createdAt: now,
    isEdited: false,
  } as never);
  comment.status = "answered";
  comment.lastMessageAt = now;
  comment.lastMessageBy = adminId;
  await comment.save();

  await NotificationModel.create({
    userId: comment.userId,
    title: "Your comment got a reply",
    message: text.length > 80 ? `${text.slice(0, 77)}...` : text,
    type: "system",
    relatedCourse: comment.courseId,
    link: `/courses/${comment.courseId}/comments/${comment._id}`,
  });

  return res.status(200).json({ success: true, comment });
};

export const addThreadMessageService = async (
  commentId: string,
  authorId: mongoose.Types.ObjectId,
  authorRole: "employee" | "admin" | "manager" | "system",
  text: string,
  res: Response,
  attachment?: ICommentAttachment, // NEW
) => {
  const comment = await CourseCommentModel.findById(commentId);
  if (!comment) return res.status(404).json({ success: false, message: "Comment thread not found" });

  const now = new Date();
  comment.messages.push({ text, authorId, authorRole, attachment, createdAt: now, isEdited: false } as never);
  comment.status = authorRole === "employee" ? "open" : "answered";
  comment.lastMessageAt = now;
  comment.lastMessageBy = authorId;
  await comment.save();

  return res.status(200).json({ success: true, comment });
};

export const getMyCommentsForCourseService = async (
  courseId: string,
  userId: mongoose.Types.ObjectId,
  res: Response,
) => {
  const comments = await CourseCommentModel.find({ courseId, userId }).sort({ lastMessageAt: -1 });
  return res.status(200).json({ success: true, comments });
};

export const getCourseCommentsService = async (courseId: string, res: Response) => {
  const comments = await CourseCommentModel.find({ courseId })
    .populate("userId", "name email department")
    .sort({ status: 1, lastMessageAt: -1 });
  return res.status(200).json({ success: true, comments });
};

export const getOpenCommentsService = async (res: Response) => {
  const comments = await CourseCommentModel.find({ status: "open" })
    .populate("userId", "name email department")
    .populate("courseId", "courseCode title")
    .sort({ lastMessageAt: 1 });
  return res.status(200).json({ success: true, comments });
};
