import { Schema, model, models, Document } from "mongoose";

export interface IQuestion extends Document {
  question: string;
  answer?: string;
  origin: "client" | "hr"; 
  isPublished: boolean;
  askerEmail?: string; 
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, trim: true },
    origin: { type: String, enum: ["client", "hr"], required: true },
    isPublished: { type: Boolean, default: false },
    askerEmail: { type: String, trim: true, lowercase: true },
  },
  { timestamps: true }
);

export default models.Question || model<IQuestion>("Question", QuestionSchema);