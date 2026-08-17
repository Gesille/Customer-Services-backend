import { Router } from "express";
import { isAuthenticated } from "../middleware/auth";
import {
  createCourse,
  getCourseById,
  updateCourse,
  publishCourse,
  archiveCourse,
  getAllCourses,
  getCourseAnalytics,
  getCourseTracker,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getMyCourses,
  openCourse,
  updateVideoProgress,
  markContentViewed,
  startQuiz,
  submitQuiz,
} from "../controllers/Course.controller";
import { getOpenComments, replyToComment, addComment, getMyCommentsForCourse, getCourseComments } from "../controllers/CourseComment.controller";

export const courseRouter = Router();

// ── Employee — "MY LEARNING" ──────────────────────────────────────────────
// ⚠️ literal route, must come before GET '/:id' below
courseRouter.get("/me/list", isAuthenticated, getMyCourses);

// ── Admin — course management ─────────────────────────────────────────────
courseRouter.post("/", isAuthenticated, createCourse);
courseRouter.get("/", isAuthenticated, getAllCourses);
courseRouter.get("/:id", isAuthenticated, getCourseById);
courseRouter.put("/:id", isAuthenticated, updateCourse);
courseRouter.patch("/:id/publish", isAuthenticated, publishCourse);
courseRouter.patch("/:id/archive", isAuthenticated, archiveCourse);
courseRouter.get("/:id/analytics", isAuthenticated, getCourseAnalytics);
courseRouter.get("/:id/tracker", isAuthenticated, getCourseTracker);

// ── Admin — quiz question management (draft courses only) ────────────────
courseRouter.post("/:courseId/questions", isAuthenticated, addQuestion);
courseRouter.put("/questions/:id", isAuthenticated, updateQuestion);
courseRouter.delete("/questions/:id", isAuthenticated, deleteQuestion);

// ── Employee — taking a course ─────────────────────────────────────────────
courseRouter.get("/:id/open", isAuthenticated, openCourse);
courseRouter.patch("/:id/video-progress", isAuthenticated, updateVideoProgress);
courseRouter.patch("/:id/content-viewed", isAuthenticated, markContentViewed);
courseRouter.post("/:id/quiz/start", isAuthenticated, startQuiz);
courseRouter.post("/:id/quiz/submit", isAuthenticated, submitQuiz);
courseRouter.get("/comments/open", isAuthenticated, getOpenComments);
courseRouter.patch("/comments/:commentId/reply", isAuthenticated, replyToComment);

// ── per-course comment thread ─────────────────────────────────────────────
courseRouter.post("/:id/comments", isAuthenticated, addComment);
courseRouter.get("/:id/comments/me", isAuthenticated, getMyCommentsForCourse);
courseRouter.get("/:id/comments", isAuthenticated, getCourseComments);
export default courseRouter;