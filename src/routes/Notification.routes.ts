import { Router } from "express";
import { isAuthenticated } from "../middleware/auth";
import {
  getNotifications,
  getMyNotifications,
  updateNotification,
} from "../controllers/Notification.controller";

export const notificationRouter = Router();

notificationRouter.get("/", isAuthenticated, getNotifications);       // admin-only, enforced in controller
notificationRouter.get("/me", isAuthenticated, getMyNotifications);   // bell icon
notificationRouter.patch("/:id/read", isAuthenticated, updateNotification);

export default notificationRouter;