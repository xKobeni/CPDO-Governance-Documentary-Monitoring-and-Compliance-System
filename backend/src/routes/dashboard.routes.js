import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { shortCache } from "../middlewares/caching.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { dashboardOverviewHandler } from "../controllers/reports.controller.js";

const r = Router();

r.use(requireAuth, checkSessionInactivity);

r.get(
  "/overview",
  requireRole("OFFICE", "STAFF", "ADMIN"),
  shortCache,
  asyncHandler(dashboardOverviewHandler)
);

export default r;
