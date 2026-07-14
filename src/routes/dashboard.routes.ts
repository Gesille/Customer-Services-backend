import { Router } from "express";
import { getDashboardStats, getScanTrend, getRecentActivity } from "../controllers/dashboard.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";

const dashboardRouter = Router();

dashboardRouter.get("/stats", isAuthenticated,authorizeRoles("admin"),getDashboardStats);
dashboardRouter.get("/scan-trend", isAuthenticated,authorizeRoles("admin"), getScanTrend);
dashboardRouter.get("/recent-activity",  isAuthenticated,authorizeRoles("admin"),getRecentActivity);

export default dashboardRouter;