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
import { getRatingsLeaderboard, submitRating, getMyRating, getCourseRatings } from "../controllers/CourseRating.controller";

export const courseRouter = Router();

// ── Employee — "MY LEARNING" ──────────────────────────────────────────────
// ⚠️ literal route, must come before GET '/:id' below
courseRouter.get("/my-courses", isAuthenticated, getMyCourses);

// ── Admin — course management ─────────────────────────────────────────────
courseRouter.post("/create-courses", isAuthenticated, createCourse);
courseRouter.get("/get-all-courses", isAuthenticated, getAllCourses);
courseRouter.get("/get-course/:id", isAuthenticated, getCourseById);
courseRouter.put("/update-course/:id", isAuthenticated, updateCourse);
courseRouter.patch("/publish-course/:id", isAuthenticated, publishCourse);
courseRouter.patch("/archive-course/:id", isAuthenticated, archiveCourse);
courseRouter.get("/analytics-course/:id", isAuthenticated, getCourseAnalytics);
courseRouter.get("/tracker-course/:id", isAuthenticated, getCourseTracker);

// ── Admin — quiz question management (draft courses only) ────────────────
courseRouter.post("/add-questions/:courseId", isAuthenticated, addQuestion);
courseRouter.put("/update-questions/:id", isAuthenticated, updateQuestion);
courseRouter.delete("/delete-questions/:id", isAuthenticated, deleteQuestion);

// ── Employee — taking a course ─────────────────────────────────────────────
courseRouter.get("/open-course/:id", isAuthenticated, openCourse);
courseRouter.patch("/update-video-progress/:id", isAuthenticated, updateVideoProgress);
courseRouter.patch("/content-viewed/:id", isAuthenticated, markContentViewed);
courseRouter.post("/start-quize/:id", isAuthenticated, startQuiz);
courseRouter.post("/submit-quize/:id", isAuthenticated, submitQuiz);
courseRouter.get("/comments-open", isAuthenticated, getOpenComments);
courseRouter.patch("/comments-reply/:commentId", isAuthenticated, replyToComment);

// ── per-course comment thread ─────────────────────────────────────────────
courseRouter.post("/add-comments/:id", isAuthenticated, addComment);
courseRouter.get("/get-mycomment/:id", isAuthenticated, getMyCommentsForCourse);
courseRouter.get("/get-course-comment/:id", isAuthenticated, getCourseComments);

courseRouter.get("/ratings-leaderboard", isAuthenticated, getRatingsLeaderboard);

// ── per-course rating ──
courseRouter.post("/submit-rating/:id", isAuthenticated, submitRating);
courseRouter.get("/my-rating/:id", isAuthenticated, getMyRating);
courseRouter.get("/get-course-rating/:id", isAuthenticated, getCourseRatings);
export default courseRouter;