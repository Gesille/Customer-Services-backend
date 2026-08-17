import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "scenario"
  | "bonus";

export interface IOption {
  text: string;
  isCorrect: boolean;
}

export interface IQuestion extends Document {
  courseId: Types.ObjectId;
  type: QuestionType;
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

const questionSchema = new Schema<IQuestion>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "multiple_choice",
        "true_false",
        "scenario",
        "bonus",
      ],
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
          return (
            Array.isArray(options) &&
            options.length > 0 &&
            options.some((option) => option.isCorrect === true)
          );
        },

        message:
          "Question must have at least one correct option",
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

questionSchema.index(
  { courseId: 1, order: 1 },
  { unique: true },
);

const QuestionModel: Model<IQuestion> =
  mongoose.models.CourseQuestion ||
  mongoose.model<IQuestion>(
    "CourseQuestion",
    questionSchema,
  );

export default QuestionModel;