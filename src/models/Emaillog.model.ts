import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type EmailRecipientStatus = "pending" | "sent" | "failed";
export type EmailBatchStatus = "queued" | "sending" | "completed" | "failed";

export interface IEmailRecipient {
  userId: Types.ObjectId;
  email: string;
  status: EmailRecipientStatus;
  error?: string;
  sentAt?: Date;
}

export interface IEmailLog extends Document {
  courseId?: Types.ObjectId;
  subject: string;
  templateName?: string;
  recipients: IEmailRecipient[];
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
  status: EmailBatchStatus;
  sentBy: Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
}

const emailRecipientSchema = new Schema<IEmailRecipient>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },

    error: {
      type: String,
    },

    sentAt: {
      type: Date,
    },
  },
  {
    _id: false,
  },
);

const emailLogSchema = new Schema<IEmailLog>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },

    subject: {
      type: String,
      required: true,
    },

    templateName: {
      type: String,
    },

    recipients: {
      type: [emailRecipientSchema],
      default: [],
    },

    totalRecipients: {
      type: Number,
      default: 0,
    },

    totalSent: {
      type: Number,
      default: 0,
    },

    totalFailed: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["queued", "sending", "completed", "failed"],
      default: "queued",
    },

    sentBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    startedAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

emailLogSchema.index({ courseId: 1 });
emailLogSchema.index({ status: 1 });
emailLogSchema.index({ createdAt: -1 });

const EmailLogModel: Model<IEmailLog> =
  mongoose.models.EmailLog || mongoose.model<IEmailLog>("EmailLog", emailLogSchema);

export default EmailLogModel;