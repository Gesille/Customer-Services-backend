import { Response } from "express";
import mongoose from "mongoose";
import AttemptModel from "../models/Attempt.model";
import CourseModel from "../models/Course.model";
import QuestionModel from "../models/CourseQuestion.model";
import NotificationModel from "../models/Notification.model";


interface ISubmittedAnswer {
  questionId: string;
  selectedOptionIndex: number;
  timeSpentSeconds?: number;
}


export const openCourseService = async (
  courseId: string,
  userId: mongoose.Types.ObjectId,
  res: Response,
) => {
  const course = await CourseModel.findOne({ _id: courseId, status: "published" });
  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found or not published",
    });
  }

  const attempt = await AttemptModel.findOne({ courseId, userId });
  if (!attempt) {
  
    return res.status(403).json({
      success: false,
      message: "This course is not assigned to you",
    });
  }

  if (attempt.status === "not_started") {
    attempt.status = "in_progress";
    attempt.openedAt = new Date();
    await attempt.save();
  }

  const questions = await QuestionModel.find({ courseId, isActive: true })
    .select("-options.isCorrect -explanation")
    .sort({ order: 1 });

  res.status(200).json({
    success: true,
    course,
    attempt,
    questions,
  });
};

export const updateVideoProgressService = async (
  courseId: string,
  userId: mongoose.Types.ObjectId,
  progressSeconds: number,
  completed: boolean,
  res: Response,
) => {
  const attempt = await AttemptModel.findOne({ courseId, userId });
  if (!attempt) {
    return res.status(403).json({ success: false, message: "This course is not assigned to you" });
  }

  if (!attempt.videoStartedAt) attempt.videoStartedAt = new Date();
  // Never let a stale/replayed progress update move the bar backwards.
  attempt.videoProgressSeconds = Math.max(attempt.videoProgressSeconds, progressSeconds);
  if (completed && !attempt.videoCompletedAt) {
    attempt.videoCompletedAt = new Date();
  }

  await attempt.save();
  res.status(200).json({ success: true, attempt });
};

export const markContentViewedService = async (
  courseId: string,
  userId: mongoose.Types.ObjectId,
  res: Response,
) => {
  const attempt = await AttemptModel.findOne({ courseId, userId });
  if (!attempt) {
    return res.status(403).json({ success: false, message: "This course is not assigned to you" });
  }

  if (!attempt.contentViewedAt) attempt.contentViewedAt = new Date();
  attempt.contentCompletedAt = new Date();

  await attempt.save();
  res.status(200).json({ success: true, attempt });
};


export const startQuizService = async (
  courseId: string,
  userId: mongoose.Types.ObjectId,
  res: Response,
) => {
  const attempt = await AttemptModel.findOne({ courseId, userId });
  if (!attempt) {
    return res.status(403).json({ success: false, message: "This course is not assigned to you" });
  }

  if (attempt.status === "completed") {
    return res.status(400).json({ success: false, message: "You have already completed this quiz" });
  }

  if (attempt.status === "expired") {
    return res.status(400).json({ success: false, message: "Your attempt has expired" });
  }

  if (attempt.quizStartedAt && attempt.quizExpiresAt) {
    // Already started — check whether time ran out while they were away.
    if (attempt.quizExpiresAt.getTime() <= Date.now()) {
      attempt.status = "expired";
      await attempt.save();
      return res.status(400).json({ success: false, message: "Time is up. Your attempt has expired." });
    }
  } else {
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    attempt.quizStartedAt = new Date();
    attempt.timeLimitSeconds = course.timeLimitSeconds; // snapshot at start time
    attempt.quizExpiresAt = new Date(Date.now() + course.timeLimitSeconds * 1000);
    attempt.status = "in_progress";
    await attempt.save();
  }

  const questions = await QuestionModel.find({ courseId, isActive: true })
    .select("-options.isCorrect -explanation")
    .sort({ order: 1 });

  res.status(200).json({
    success: true,
    quizStartedAt: attempt.quizStartedAt,
    quizExpiresAt: attempt.quizExpiresAt,
    timeLimitSeconds: attempt.timeLimitSeconds,
    questions,
  });
};

export const submitQuizService = async (
  courseId: string,
  userId: mongoose.Types.ObjectId,
  submittedAnswers: ISubmittedAnswer[],
  res: Response,
) => {
  const attempt = await AttemptModel.findOne({ courseId, userId });
  if (!attempt) {
    return res.status(403).json({ success: false, message: "This course is not assigned to you" });
  }

  if (attempt.status === "completed") {
    return res.status(400).json({ success: false, message: "You have already submitted this quiz" });
  }

  if (!attempt.quizStartedAt || !attempt.quizExpiresAt) {
    return res.status(400).json({ success: false, message: "Quiz has not been started" });
  }

  const now = new Date();
  if (now.getTime() > attempt.quizExpiresAt.getTime()) {
    attempt.status = "expired";
    await attempt.save();
    return res.status(400).json({
      success: false,
      message: "Time is up. This attempt has expired and can no longer be submitted.",
    });
  }

  const course = await CourseModel.findById(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  const questions = await QuestionModel.find({ courseId, isActive: true });
  const questionById = new Map(questions.map((q) => [q._id.toString(), q]));

  let score = 0;
  let correctAnswersCount = 0;
  const totalPossibleScore = questions.reduce((sum, q) => sum + q.points, 0);

  const answerRecords = submittedAnswers
    .filter((a) => questionById.has(a.questionId))
    .map((a) => {
      const question = questionById.get(a.questionId)!;
      const selectedOption = question.options[a.selectedOptionIndex];
      const isCorrect = Boolean(selectedOption?.isCorrect);
      const pointsEarned = isCorrect ? question.points : 0;

      score += pointsEarned;
      if (isCorrect) correctAnswersCount++;

      return {
        questionId: question._id,
        selectedOptionIndex: a.selectedOptionIndex,
        isCorrect,
        pointsEarned,
        timeSpentSeconds: a.timeSpentSeconds ?? 0,
        answeredAt: now,
      };
    });

  const percentage = totalPossibleScore > 0 ? Math.round((score / totalPossibleScore) * 100) : 0;
    const passingScore = attempt.passingScoreSnapshot || course.passingScore;
  const passed = score >= passingScore;

  const isLate = attempt.dueAt ? now.getTime() > attempt.dueAt.getTime() : false;
  const timeTakenSeconds = Math.round((now.getTime() - attempt.quizStartedAt.getTime()) / 1000);

    attempt.answers = answerRecords;
  attempt.answeredQuestionsCount = answerRecords.length;
  attempt.score = score;

  attempt.totalPossibleScore = totalPossibleScore;
  attempt.totalQuestions = questions.length;
  attempt.correctAnswersCount = correctAnswersCount;
  attempt.percentage = percentage;
    attempt.passed = passed;
  attempt.isLate = isLate;
  attempt.completedAt = now;
  attempt.submittedAt = now;
  attempt.timeTakenSeconds = timeTakenSeconds;
  attempt.completionState = "completed";
  attempt.status = "completed";

  await attempt.save();

  await NotificationModel.create({
    userId,
    title: passed ? "Course completed 🎉" : "Course completed",
    message: `You scored ${score}/${totalPossibleScore} (${percentage}%) on ${course.courseCode}${
      isLate ? " — submitted late" : ""
    }.`,
    type: "result",
    relatedCourse: course._id,
    link: `/courses/${course._id}/result`,
  });

  res.status(200).json({
    success: true,
    score,
    totalPossibleScore,
    percentage,
    passed,
    isLate,
    correctAnswersCount,
    totalQuestions: questions.length,
  });
};

/**
 * Admin/HR tracker: every attempt for a course, with the employee's basic
 * info populated in, sorted by most recently updated first.
 */
export const getCourseTrackerService = async (
  courseId: string,
  filters: { status?: string; isLate?: boolean; passed?: boolean; department?: string },
  res: Response,
) => {
  const query: Record<string, unknown> = { courseId };
  if (filters.status) query.status = filters.status;
  if (typeof filters.isLate === "boolean") query.isLate = filters.isLate;
  if (typeof filters.passed === "boolean") query.passed = filters.passed;

  const attempts = await AttemptModel.find(query)
    .populate({ path: "userId", select: "name email department employeeId" , match: filters.department ? { department: filters.department } : undefined })
    .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    filters,
    attempts: filters.department ? attempts.filter((attempt) => attempt.userId) : attempts,
  });
};


export const autosaveQuizAnswersService = async (
  courseId: string,
  userId: mongoose.Types.ObjectId,
  submittedAnswers: Array<{ questionId: string; selectedOptionIndex?: number; timeSpentSeconds?: number }>,
  res: Response,
) => {
  const attempt = await AttemptModel.findOne({ courseId, userId });
  if (!attempt) return res.status(403).json({ success: false, message: "This course is not assigned to you" });
  if (attempt.status === "completed" || attempt.status === "expired") {
    return res.status(400).json({ success: false, message: "This quiz attempt is no longer active" });
  }
  if (!attempt.quizStartedAt || !attempt.quizExpiresAt) {
    return res.status(400).json({ success: false, message: "Quiz has not been started" });
  }
  if (Date.now() >= attempt.quizExpiresAt.getTime()) {
    attempt.status = "expired";
    attempt.expiredAt = new Date();
    await attempt.save();
    return res.status(400).json({ success: false, message: "Time is up. Your attempt has expired." });
  }

  const questions = await QuestionModel.find({ courseId, isActive: true }).select("_id");
  const validQuestionIds = new Set(questions.map((question) => question._id.toString()));
  const now = new Date();
  const existingByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId.toString(), answer]));

  for (const answer of submittedAnswers) {
    if (!validQuestionIds.has(answer.questionId)) continue;
    existingByQuestion.set(answer.questionId, {
      questionId: new mongoose.Types.ObjectId(answer.questionId),
      selectedOptionIndex: answer.selectedOptionIndex,
      isCorrect: false,
      pointsEarned: 0,
      timeSpentSeconds: Math.max(0, answer.timeSpentSeconds || 0),
      answeredAt: now,
    });
  }

  attempt.answers = Array.from(existingByQuestion.values());
  attempt.answeredQuestionsCount = attempt.answers.length;
  attempt.completionState = "quiz_in_progress";
  await attempt.save();

  return res.status(200).json({
    success: true,
    savedAnswers: attempt.answeredQuestionsCount,
    quizExpiresAt: attempt.quizExpiresAt,
  });
};
