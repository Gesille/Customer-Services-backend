import { Router } from "express";
import { getDashboardStats, getScanTrend, getRecentActivity, getApplicantFunnel, getConversionRate, getRestaurantsNeedingQr } from "../controllers/dashboard.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";

const dashboardRouter = Router();

dashboardRouter.get("/stats", isAuthenticated,authorizeRoles("admin"),getDashboardStats);
dashboardRouter.get("/scan-trend", isAuthenticated,authorizeRoles("admin"), getScanTrend);
dashboardRouter.get("/recent-activity",  isAuthenticated,authorizeRoles("admin"),getRecentActivity);
dashboardRouter.get("/applicant-funnel", isAuthenticated,authorizeRoles("admin"),getApplicantFunnel);
dashboardRouter.get("/conversion-rate", isAuthenticated,authorizeRoles("admin"),getConversionRate);
dashboardRouter.get("/setup-needed",isAuthenticated,authorizeRoles("admin"), getRestaurantsNeedingQr);

export default dashboardRouter;