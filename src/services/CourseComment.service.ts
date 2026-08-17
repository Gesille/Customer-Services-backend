import { Response } from "express";
import mongoose from "mongoose";
import CourseCommentModel from "../models/CourseComment.model";
import CourseModel from "../models/Course.model";
import AttemptModel from "../models/Attempt.model";
import NotificationModel from "../models/Notification.model";
import userModel, { ROLES } from "../models/user.model";

// ── Employee posts a comment on a course they're assigned to ──────────────
export const addCommentService = async (
  courseId: string,
  userId: mongoose.Types.ObjectId,
  text: string,
  res: Response,
) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  // Only employees actually assigned to this course can comment on it —
  // mirrors the same check openCourseService uses.
  const attempt = await AttemptModel.findOne({ courseId, userId });
  if (!attempt) {
    return res.status(403).json({ success: false, message: "This course is not assigned to you" });
  }

  const comment = await CourseCommentModel.create({ courseId, userId, text });

  // Notify every admin — someone needs to see it to reply.
  const admins = await userModel.find({ role: ROLES.ADMIN, isActive: true }).select("_id");
  if (admins.length > 0) {
    await NotificationModel.insertMany(
      admins.map((a) => ({
        userId: a._id,
        title: "New course comment",
        message: `${course.courseCode}: a learner left a comment.`,
        type: "system",
        relatedCourse: course._id,
        link: `/admin/courses/${course._id}/comments`,
      })),
    );
  }

  res.status(201).json({ success: true, comment });
};

// ── Admin replies to a comment ─────────────────────────────────────────────
export const replyToCommentService = async (
  commentId: string,
  adminId: mongoose.Types.ObjectId,
  text: string,
  res: Response,
) => {
  const comment = await CourseCommentModel.findById(commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: "Comment not found" });
  }

  comment.reply = { text, repliedBy: adminId, repliedAt: new Date() };
  comment.status = "answered";
  await comment.save();

  // Let the employee know their comment got a reply.
  await NotificationModel.create({
    userId: comment.userId,
    title: "Your comment got a reply",
    message: text.length > 80 ? `${text.slice(0, 77)}...` : text,
    type: "system",
    relatedCourse: comment.courseId,
    link: `/courses/${comment.courseId}`,
  });

  res.status(200).json({ success: true, comment });
};

// ── Employee's own comment thread on one course ────────────────────────────
export const getMyCommentsForCourseService = async (
  courseId: string,
  userId: mongoose.Types.ObjectId,
  res: Response,
) => {
  const comments = await CourseCommentModel.find({ courseId, userId }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, comments });
};

// ── Admin — every comment for one course (open first, then answered) ──────
export const getCourseCommentsService = async (courseId: string, res: Response) => {
  const comments = await CourseCommentModel.find({ courseId })
    .populate("userId", "name email department")
    .sort({ status: 1, createdAt: -1 }); // "open" < "answered" alphabetically → open first

  res.status(200).json({ success: true, comments });
};

// ── Admin dashboard — every unanswered comment across all courses ─────────
export const getOpenCommentsService = async (res: Response) => {
  const comments = await CourseCommentModel.find({ status: "open" })
    .populate("userId", "name email department")
    .populate("courseId", "courseCode title")
    .sort({ createdAt: 1 }); // oldest first — the ones waiting longest

  res.status(200).json({ success: true, comments });
};