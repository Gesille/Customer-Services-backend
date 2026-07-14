import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IContactSubmission extends Document {
  name: string;
  email: string;
  message: string;
  status: "new" | "read" | "responded";
  createdAt: Date;
  updatedAt: Date;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["new", "read", "responded"],
      default: "new",
    },
  },
  { timestamps: true }
);

export default models.ContactSubmission ||
  model<IContactSubmission>("ContactSubmission", ContactSubmissionSchema);