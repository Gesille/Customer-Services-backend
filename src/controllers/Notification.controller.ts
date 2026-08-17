import NotificationModel from "../models/Notification.model";
import { NextFunction, Response, Request } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";

import { ROLES } from "../models/user.model";
import cron from "node-cron";
import ErrorHandler from "../middleware/ErrorHandler";
import UserNotificationDeviceModel from "../models/UserNotificationDevice.model";


// get all notifications — admin only, across all users (moderation / debugging view)
export const getNotifications = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("Only admins can view all notifications", 403));
    }

    const notifications = await NotificationModel.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      notifications,
    });
  },
);

// get the logged-in user's own notifications — this is what the bell icon uses
export const getMyNotifications = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ErrorHandler("Please log in", 401));
    }

    const notifications = await NotificationModel.find({ userId: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      unreadCount: notifications.filter((n) => n.status === "unread").length,
      notifications,
    });
  },
);

// mark a single notification as read — only its owner (or an admin) may do this
export const updateNotification = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const notification = await NotificationModel.findById(req.params.id);
    if (!notification) {
      return next(new ErrorHandler("Notification not found", 404));
    }

    const isOwner = notification.userId.toString() === req.user?._id?.toString();
    if (!isOwner && req.user?.role !== ROLES.ADMIN) {
      return next(new ErrorHandler("You can only update your own notifications", 403));
    }

    if (notification.status === "unread") {
      notification.status = "read";
      notification.readAt = new Date();
      await notification.save();
    }

    res.status(200).json({
      success: true,
      notification,
    });
  },
);

export const registerNotificationDevice = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new ErrorHandler("Please log in", 401));
    const { notificationId, platform, deviceName } = req.body as {
      notificationId?: string;
      platform?: "web" | "ios" | "android" | "email";
      deviceName?: string;
    };
    if (!notificationId || !platform) return next(new ErrorHandler("notificationId and platform are required", 400));
    const device = await UserNotificationDeviceModel.findOneAndUpdate(
      { userId: req.user._id, notificationId },
      { $set: { platform, deviceName, isActive: true, lastSeenAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.status(200).json({ success: true, device });
  },
);

export const revokeNotificationDevice = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new ErrorHandler("Please log in", 401));
    const device = await UserNotificationDeviceModel.findOneAndUpdate(
      { userId: req.user._id, notificationId: req.params.notificationId },
      { $set: { isActive: false } },
      { new: true },
    );
    if (!device) return next(new ErrorHandler("Notification device not found", 404));
    return res.status(200).json({ success: true, device });
  },
);

// delete notifications older than 30 days that have already been read.

// Kept as a scheduled job at module load — for a multi-instance deployment,
// move this into a single dedicated jobs/index.ts bootstrap so it doesn't
// risk running once per instance.
cron.schedule("0 0 0 * * *", async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await NotificationModel.deleteMany({
    status: "read",
    createdAt: { $lt: thirtyDaysAgo },
  });
  console.log(`Deleted ${result.deletedCount} read notification(s) older than 30 days`);
});