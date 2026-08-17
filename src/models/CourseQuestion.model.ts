import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CourseQuestionType =
  | "multiple_choice"
  | "true_false"
  | "scenario"
  | "bonus";

export interface IOption {
  text: string;
  isCorrect: boolean;
}

export interface ICourseQuestion extends Document {
  courseId: Types.ObjectId;
  type: CourseQuestionType;
  order: number;
  text: string;
  options: IOption[];
  points: number;
  explanation?: string;
  isActive: boolean;
}

const optionSchema = new Schema<IOption>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const coursequestionSchema = new Schema<ICourseQuestion>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["multiple_choice", "true_false", "scenario", "bonus"],
      required: true,
    },

    order: {
      type: Number,
      required: true,
      min: 1,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    options: {
      type: [optionSchema],
      required: true,
      validate: {
        validator: function (options: IOption[]) {
          return options.length > 0 && options.some((option) => option.isCorrect);
        },
        message: "Question must have at least one correct option",
      },
    },

    points: {
      type: Number,
      default: 1,
      min: 1,
    },

    explanation: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

coursequestionSchema.index({ courseId: 1, order: 1 }, { unique: true });

const CourseQuestionModel: Model<ICourseQuestion> =
  mongoose.models.Question || mongoose.model<ICourseQuestion>("Question", coursequestionSchema);

export default CourseQuestionModel;