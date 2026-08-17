import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type NotificationType =
  | "new_course"
  | "reminder"
  | "deadline_passed"
  | "result"
  | "system";

export interface INotification extends Document {
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  relatedCourse?: Types.ObjectId;
  link?: string;
  status: "unread" | "read";
  readAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["new_course", "reminder", "deadline_passed", "result", "system"],
      default: "system",
    },

    relatedCourse: {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },

    link: {
      type: String,
    },

    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
    },

    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

const NotificationModel: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", notificationSchema);

export default NotificationModel;