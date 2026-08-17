import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";


import CourseModel from "../models/Course.model";
import QuestionModel from "../models/CourseQuestion.model";
import { ROLES } from "../models/user.model";

import {
  createCourseService,
  publishCourseService,
  getAllCoursesService,
  getMyCoursesService,
  getCourseAnalyticsService,
} from "../services/Course.service";

import {
  openCourseService,
  updateVideoProgressService,
  markContentViewedService,
  startQuizService,
    submitQuizService,
  autosaveQuizAnswersService,
  getCourseTrackerService,

} from "../services/Attempt.service";
import ErrorHandler from "../middleware/ErrorHandler";

// create a course as a draft, with its quiz questions
export const createCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can create courses", 403));
    }
    await createCourseService(req.body, req.user._id, res);
  },
);

// fetch a single course + its questions, for the admin edit screen
export const getCourseById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can view this", 403));
    }

    const course = await CourseModel.findById(req.params.id);
    if (!course) {
      return next(new ErrorHandler("Course not found", 404));
    }

    const questions = await QuestionModel.find({ courseId: course._id }).sort({ order: 1 });

    res.status(200).json({ success: true, course, questions });
  },
);

// edit a course's own fields — only while it's still a draft. Editing a
// published course's content while people are mid-attempt would corrupt
// the analytics snapshot; archive + create a new version instead.
export const updateCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can edit courses", 403));
    }

    const course = await CourseModel.findById(req.params.id);
    if (!course) {
      return next(new ErrorHandler("Course not found", 404));
    }

    if (course.status !== "draft") {
      return next(
        new ErrorHandler("Only draft courses can be edited. Archive this one and create a new version instead.", 400),
      );
    }

    const { questions, order, courseCode, status, ...safeUpdates } = req.body;

    const updated = await CourseModel.findByIdAndUpdate(course._id, { $set: safeUpdates }, { new: true });

    res.status(200).json({ success: true, course: updated });
  },
);

// publish a draft -> creates Attempts + notifications + emails for every
// active employee (all handled in the service, including the EmailLog).
export const publishCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can publish courses", 403));
    }
    await publishCourseService(req.params.id as string, req.user._id, res);
  },
);

// archive a course — soft delete, keeps Attempts/analytics intact
export const archiveCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can archive courses", 403));
    }

    const course = await CourseModel.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "archived" } },
      { new: true },
    );

    if (!course) {
      return next(new ErrorHandler("Course not found", 404));
    }

    res.status(200).json({ success: true, course });
  },
);

// admin dashboard listing
export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can view all courses", 403));
    }
    await getAllCoursesService(res);
  },
);

// summary + per-question stats for one course
export const getCourseAnalytics = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can view analytics", 403));
    }
    await getCourseAnalyticsService(req.params.id as string, res);
  },
);

// per-employee status for one course — the "tracker" (who's late, who's done)
export const getCourseTracker = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can view the tracker", 403));
    }
        const { status, isLate, passed, department } = req.query;
    const toBoolean = (value: unknown) => value === "true" ? true : value === "false" ? false : undefined;
    await getCourseTrackerService(req.params.id as string, {
      status: typeof status === "string" ? status : undefined,
      isLate: toBoolean(isLate),
      passed: toBoolean(passed),
      department: typeof department === "string" ? department : undefined,
    }, res);

  },
);

/* ────────────────────────────────────────────────────────────────────────
 * ADMIN / HR — quiz question management (draft courses only)
 * ──────────────────────────────────────────────────────────────────────── */

export const addQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can manage questions", 403));
    }

    const course = await CourseModel.findById(req.params.courseId);
    if (!course) {
      return next(new ErrorHandler("Course not found", 404));
    }
    if (course.status !== "draft") {
      return next(new ErrorHandler("Questions can only be edited while the course is a draft", 400));
    }

    const questionCount = await QuestionModel.countDocuments({ courseId: course._id });

    const question = await QuestionModel.create({
      ...req.body,
      courseId: course._id,
      order: questionCount + 1,
    });

    res.status(201).json({ success: true, question });
  },
);

export const updateQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can manage questions", 403));
    }

    const question = await QuestionModel.findById(req.params.id);
    if (!question) {
      return next(new ErrorHandler("Question not found", 404));
    }

    const course = await CourseModel.findById(question.courseId);
    if (course?.status !== "draft") {
      return next(new ErrorHandler("Questions can only be edited while the course is a draft", 400));
    }

    const { courseId, order, ...safeUpdates } = req.body;
    const updated = await QuestionModel.findByIdAndUpdate(question._id, { $set: safeUpdates }, { new: true });

    res.status(200).json({ success: true, question: updated });
  },
);

export const deleteQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can manage questions", 403));
    }

    const question = await QuestionModel.findById(req.params.id);
    if (!question) {
      return next(new ErrorHandler("Question not found", 404));
    }

    const course = await CourseModel.findById(question.courseId);
    if (course?.status !== "draft") {
      return next(new ErrorHandler("Questions can only be edited while the course is a draft", 400));
    }

    await question.deleteOne();

    res.status(200).json({ success: true, message: "Question deleted" });
  },
);

/* ────────────────────────────────────────────────────────────────────────
 * EMPLOYEE — taking a course
 * ──────────────────────────────────────────────────────────────────────── */

// "MY LEARNING" list — every course assigned to the logged-in employee
export const getMyCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ErrorHandler("Please log in", 401));
    }
    await getMyCoursesService(req.user._id, res);
  },
);

// open a course: internal learning screen (video + key points + quiz entry)

export const openCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ErrorHandler("Please log in", 401));
    }
    await openCourseService(req.params.id as string, req.user._id, res);
  },
);

export const updateVideoProgress = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ErrorHandler("Please log in", 401));
    }

    const { progressSeconds, completed } = req.body as {
      progressSeconds: number;
      completed?: boolean;
    };

    if (typeof progressSeconds !== "number" || progressSeconds < 0) {
      return next(new ErrorHandler("progressSeconds must be a non-negative number", 400));
    }

    await updateVideoProgressService(req.params.id as string, req.user._id, progressSeconds, Boolean(completed), res);
  },
);

export const markContentViewed = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ErrorHandler("Please log in", 401));
    }
    await markContentViewedService(req.params.id as string, req.user._id, res);
  },
);

// starts (or resumes) the quiz timer, returns questions without answers
export const startQuiz = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ErrorHandler("Please log in", 401));
    }
    await startQuizService(req.params.id as string, req.user._id, res);
  },
);

export const autosaveQuizAnswers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new ErrorHandler("Please log in", 401));
    const { answers } = req.body as { answers: Array<{ questionId: string; selectedOptionIndex?: number; timeSpentSeconds?: number }> };
    if (!Array.isArray(answers)) return next(new ErrorHandler("answers must be an array", 400));
    await autosaveQuizAnswersService(req.params.id as string, req.user._id, answers, res);
  },
);

// grades the quiz — server enforces the timer regardless of client state
export const submitQuiz = CatchAsyncError(

  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ErrorHandler("Please log in", 401));
    }

    const { answers } = req.body as {
      answers: Array<{ questionId: string; selectedOptionIndex: number; timeSpentSeconds?: number }>;
    };

    if (!Array.isArray(answers)) {
      return next(new ErrorHandler("answers must be an array", 400));
    }

    await submitQuizService(req.params.id as string, req.user._id, answers, res);
  },
);

