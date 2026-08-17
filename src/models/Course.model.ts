import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CourseStatus = "draft" | "published" | "archived";

export interface ICourse extends Document {
  order: number;
  courseCode: string;

  title: string;
  hook: string;
  topic: string;

  heroImage?: {
    public_id: string;
    url: string;
  };

  videoUrl: string;
  videoDurationSeconds: number;

  whatYouNeedToKnow: string;
  keyPoints: string[];

  durationMinutes: number;
  timeLimitSeconds: number; 

  passingScore: number;

  status: CourseStatus;
avgCourseRating?: number;
avgQuizRating?: number;
ratingCount?: number;

  dueInDays: number;

  sharepointUrl?: string;
  sharepointSlug?: string;

  mailchimpCampaignId?: string;

  createdBy: Types.ObjectId;
}

const courseSchema = new Schema<ICourse>(
  {
    order: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },

    courseCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    hook: {
      type: String,
      required: true,
      trim: true,
    },

    topic: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
 avgCourseRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    avgQuizRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    heroImage: {
      public_id: String,
      url: String,
    },

    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },

    videoDurationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    whatYouNeedToKnow: {
      type: String,
      required: true,
    },

    keyPoints: {
      type: [String],
      default: [],
    },

    durationMinutes: {
      type: Number,
      default: 5,
      min: 1,
    },

    timeLimitSeconds: {
      type: Number,
      default: 300,
      min: 30,
    },

    passingScore: {
      type: Number,
      default: 4,
      min: 0,
    },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },

    dueInDays: {
      type: Number,
      default: 7,
      min: 1,
    },

    sharepointUrl: {
      type: String,
      trim: true,
    },

    sharepointSlug: {
      type: String,
      trim: true,
    },

    mailchimpCampaignId: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

courseSchema.pre("save", function () {
  if (!this.courseCode) {
    const padded = String(this.order).padStart(2, "0");
    this.courseCode = `NEXT LEARN #${padded}`;
  }
});

courseSchema.index({ status: 1, createdAt: -1 });
courseSchema.index({ topic: 1 });

const CourseModel: Model<ICourse> =
  mongoose.models.Course || mongoose.model<ICourse>("Course", courseSchema);

export default CourseModel;