import { Router } from "express";
import { isAuthenticated } from "../middleware/auth";
import {
  getNotifications,
  getMyNotifications,
    updateNotification,
  registerNotificationDevice,
  revokeNotificationDevice,

} from "../controllers/Notification.controller";

export const notificationRouter = Router();

notificationRouter.get("/", isAuthenticated, getNotifications);     
notificationRouter.get("/me", isAuthenticated, getMyNotifications);  
notificationRouter.patch("/:id/read", isAuthenticated, updateNotification);
notificationRouter.post("/devices", isAuthenticated, registerNotificationDevice);
notificationRouter.delete("/devices/:notificationId", isAuthenticated, revokeNotificationDevice);

export default notificationRouter;