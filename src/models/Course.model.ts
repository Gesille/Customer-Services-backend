import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CourseStatus = "draft" | "published" | "archived";
export type CourseDifficulty = "beginner" | "intermediate" | "advanced";

export interface IHeroImage {
  public_id: string;
  url: string;
  altText?: string;
}

export interface ICourse extends Document {
  order: number;
  courseCode: string;
  slug: string;
  version: number;
  title: string;
  hook: string;
  topic: string;
  category?: string;
  difficulty: CourseDifficulty;
  heroImage?: IHeroImage;
  videoUrl: string;
  videoDurationSeconds: number;
  whatYouNeedToKnow: string;
  keyPoints: string[];
  durationMinutes: number;
  timeLimitSeconds: number;
  passingScore: number;
  status: CourseStatus;
  publishedAt?: Date;
  archivedAt?: Date;
  dueInDays: number;
  audienceFilter?: { departments?: string[]; roles?: string[]; employeeIds?: string[] };
  avgCourseRating: number;
  avgQuizRating: number;
  courseRatingCount: number;
  quizRatingCount: number;
  ratingCount: number;
  assignmentCount: number;
  completionCount: number;
  passCount: number;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    order: { type: Number, required: true, min: 1 },
    courseCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    version: { type: Number, default: 1, min: 1 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    hook: { type: String, required: true, trim: true, maxlength: 300 },
    topic: { type: String, required: true, trim: true, index: true },
    category: { type: String, trim: true, index: true },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    heroImage: {
      public_id: { type: String, trim: true },
      url: { type: String, trim: true },
      altText: { type: String, trim: true, maxlength: 200 },
    },
    videoUrl: { type: String, required: true, trim: true },
    videoDurationSeconds: { type: Number, default: 0, min: 0 },
    whatYouNeedToKnow: { type: String, required: true, trim: true },
    keyPoints: { type: [String], default: [] },
    durationMinutes: { type: Number, default: 5, min: 1 },
    timeLimitSeconds: { type: Number, default: 300, min: 1 },
    passingScore: { type: Number, default: 4, min: 0 },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    publishedAt: Date,
    archivedAt: Date,
    dueInDays: { type: Number, default: 7, min: 1 },
    audienceFilter: {
      departments: { type: [String], default: [] },
      roles: { type: [String], default: [] },
      employeeIds: { type: [String], default: [] },
    },
    avgCourseRating: { type: Number, default: 0, min: 0, max: 5 },
    avgQuizRating: { type: Number, default: 0, min: 0, max: 5 },
    courseRatingCount: { type: Number, default: 0, min: 0 },
    quizRatingCount: { type: Number, default: 0, min: 0 },
    ratingCount: { type: Number, default: 0, min: 0 },
    assignmentCount: { type: Number, default: 0, min: 0 },
    completionCount: { type: Number, default: 0, min: 0 },
    passCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

courseSchema.index({ status: 1, createdAt: -1 });
courseSchema.index({ topic: 1, status: 1 });

const CourseModel: Model<ICourse> =
  mongoose.models.Course || mongoose.model<ICourse>("Course", courseSchema);

export default CourseModel;
