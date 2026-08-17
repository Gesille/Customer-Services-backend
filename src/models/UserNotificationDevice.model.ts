import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type NotificationPlatform = "web" | "ios" | "android" | "email";

export interface IUserNotificationDevice extends Document {
  userId: Types.ObjectId;
  notificationId: string;
  platform: NotificationPlatform;
  deviceName?: string;
  isActive: boolean;
  lastSeenAt?: Date;
  lastDeliveredAt?: Date;
  failedDeliveries: number;
  createdAt: Date;
  updatedAt: Date;
}

const userNotificationDeviceSchema = new Schema<IUserNotificationDevice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    notificationId: { type: String, required: true, trim: true },
    platform: { type: String, enum: ["web", "ios", "android", "email"], required: true },
    deviceName: { type: String, trim: true, maxlength: 100 },
    isActive: { type: Boolean, default: true, index: true },
    lastSeenAt: Date,
    lastDeliveredAt: Date,
    failedDeliveries: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

userNotificationDeviceSchema.index({ userId: 1, notificationId: 1 }, { unique: true });
userNotificationDeviceSchema.index({ notificationId: 1, isActive: 1 });

const UserNotificationDeviceModel: Model<IUserNotificationDevice> =
  mongoose.models.UserNotificationDevice ||
  mongoose.model<IUserNotificationDevice>("UserNotificationDevice", userNotificationDeviceSchema);

export default UserNotificationDeviceModel;
