import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { mediumCache } from "../middlewares/caching.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  getUserStatsHandler,
  getRecentActivityHandler,
  getOfficePerformanceHandler,
  getReviewerPerformanceHandler
} from "../controllers/analytics.controller.js";

const r = Router();

r.use(requireAuth, checkSessionInactivity, requireRole("ADMIN", "STAFF"));

r.get("/user-stats", mediumCache, asyncHandler(getUserStatsHandler));
r.get("/recent-activity", asyncHandler(getRecentActivityHandler));
r.get("/office-performance", mediumCache, asyncHandler(getOfficePerformanceHandler));
r.get("/reviewer-performance", mediumCache, asyncHandler(getReviewerPerformanceHandler));

export default r;
