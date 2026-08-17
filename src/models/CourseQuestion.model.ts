import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type QuestionType = "multiple_choice" | "true_false" | "scenario" | "short_answer" | "bonus";

export interface IOption {
  text: string;
  value: string;
  isCorrect: boolean;
}

export interface IQuestion extends Document {
  courseId: Types.ObjectId;
  type: QuestionType;
  order: number;
  text: string;
  scenarioContext?: string;
  options: IOption[];
  expectedAnswer?: string;
  points: number;
  explanation?: string;
  isRequired: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const optionSchema = new Schema<IOption>(
  {
    text: { type: String, required: true, trim: true, maxlength: 500 },
    value: { type: String, required: true, trim: true, maxlength: 100 },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: true },
);

const questionSchema = new Schema<IQuestion>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    type: {
      type: String,
      enum: ["multiple_choice", "true_false", "scenario", "short_answer", "bonus"],
      required: true,
    },
    order: { type: Number, required: true, min: 1 },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    scenarioContext: { type: String, trim: true, maxlength: 5000 },
    options: { type: [optionSchema], default: [] },
    expectedAnswer: { type: String, trim: true, maxlength: 1000 },
    points: { type: Number, default: 1, min: 0 },
    explanation: { type: String, trim: true, maxlength: 2000 },
    isRequired: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

questionSchema.index({ courseId: 1, order: 1 }, { unique: true });
questionSchema.index({ courseId: 1, isActive: 1, order: 1 });

const QuestionModel: Model<IQuestion> =
  mongoose.models.Question || mongoose.model<IQuestion>("Question", questionSchema);

export default QuestionModel;
