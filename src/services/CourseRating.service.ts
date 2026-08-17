import { Response } from "express";
import mongoose from "mongoose";
import CourseRatingModel from "../models/CourseRating.model";
import AttemptModel from "../models/Attempt.model";
import CourseModel from "../models/Course.model";

// Recomputed from the ratings collection on every write — ratings are
// infrequent (once per user per course), so aggregate-on-write is cheap
// and avoids incremental-average bugs when a rating is edited later.
async function recomputeCourseRatingAggregate(courseId: string) {
  const [agg] = await CourseRatingModel.aggregate([
    { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: "$courseId",
        avgCourseRating: { $avg: "$courseRating" },
        avgQuizRating: { $avg: "$quizRating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  await CourseModel.findByIdAndUpdate(courseId, {
    avgCourseRating: agg ? Math.round(agg.avgCourseRating * 10) / 10 : 0,
    avgQuizRating: agg ? Math.round(agg.avgQuizRating * 10) / 10 : 0,
    ratingCount: agg ? agg.ratingCount : 0,
  });
}

// Employee — submit or edit their rating for a course they've completed
export const submitRatingService = async (
  courseId: string,
  userId: mongoose.Types.ObjectId,
  data: {
    courseRating: number;
    courseFeedback?: string;
    quizRating: number;
    quizFeedback?: string;
  },
  res: Response,
) => {
  const attempt = await AttemptModel.findOne({ courseId, userId });
  if (!attempt) {
    return res.status(403).json({ success: false, message: "This course is not assigned to you" });
  }
  if (attempt.status !== "completed") {
    return res.status(400).json({ success: false, message: "Finish the quiz before rating this course" });
  }

  const rating = await CourseRatingModel.findOneAndUpdate(
    { courseId, userId },
    {
      courseId,
      userId,
      attemptId: attempt._id,
      courseRating: data.courseRating,
      courseFeedback: data.courseFeedback,
      quizRating: data.quizRating,
      quizFeedback: data.quizFeedback,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );

  if (!attempt.hasRated) {
    attempt.hasRated = true;
    await attempt.save();
  }

  await recomputeCourseRatingAggregate(courseId);

  res.status(200).json({ success: true, rating });
};

// Employee — their own rating for a course (null if not rated yet, for the "Rate this course" prompt)
export const getMyRatingService = async (
  courseId: string,
  userId: mongoose.Types.ObjectId,
  res: Response,
) => {
  const rating = await CourseRatingModel.findOne({ courseId, userId });
  res.status(200).json({ success: true, rating: rating || null });
};

// Admin — every rating left on one course, plus the aggregate numbers
export const getCourseRatingsService = async (courseId: string, res: Response) => {
  const [ratings, course] = await Promise.all([
    CourseRatingModel.find({ courseId })
      .populate("userId", "name email department")
      .sort({ createdAt: -1 }),
    CourseModel.findById(courseId).select(
      "avgCourseRating avgQuizRating ratingCount title courseCode",
    ),
  ]);

  res.status(200).json({ success: true, course, ratings });
};

// Admin dashboard — courses ranked by rating (mirrors the restaurant leaderboard pattern)
export const getCourseRatingsLeaderboardService = async (res: Response) => {
  const courses = await CourseModel.find({ ratingCount: { $gt: 0 } })
    .select("title courseCode avgCourseRating avgQuizRating ratingCount")
    .sort({ avgCourseRating: -1 });

  res.status(200).json({ success: true, courses });
};