import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICourseRating extends Document {
  courseId: Types.ObjectId;
  userId: Types.ObjectId;
  attemptId: Types.ObjectId; // ties the rating to the specific completed attempt

  courseRating: number; // 1-5 — was the content useful/clear?
  courseFeedback?: string;

  quizRating: number; // 1-5 — was the quiz fair / reasonable difficulty?
  quizFeedback?: string;

  createdAt: Date;
  updatedAt: Date;
}

const courseRatingSchema = new Schema<ICourseRating>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    attemptId: { type: Schema.Types.ObjectId, ref: "Attempt", required: true },

    courseRating: { type: Number, required: true, min: 1, max: 5 },
    courseFeedback: { type: String, trim: true, maxlength: 500 },

    quizRating: { type: Number, required: true, min: 1, max: 5 },
    quizFeedback: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

// One rating per user per course — resubmitting edits it (see service: findOneAndUpdate + upsert)
courseRatingSchema.index({ courseId: 1, userId: 1 }, { unique: true });

const CourseRatingModel: Model<ICourseRating> =
  mongoose.models.CourseRating || mongoose.model<ICourseRating>("CourseRating", courseRatingSchema);

export default CourseRatingModel;