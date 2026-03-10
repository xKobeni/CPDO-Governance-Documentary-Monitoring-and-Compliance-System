import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { mediumCache } from "../middlewares/caching.js";
import {
  getAuditLogsHandler,
  getAuditStatsHandler,
  exportAuditLogsHandler
} from "../controllers/audit.controller.js";

const r = Router();

// All audit log routes require authentication and ADMIN role
r.use(requireAuth, checkSessionInactivity, requireRole("ADMIN"));

// GET - List audit logs with filters and pagination
r.get("/", mediumCache, asyncHandler(getAuditLogsHandler));

// GET - Get audit log statistics
r.get("/stats", mediumCache, asyncHandler(getAuditStatsHandler));

// GET - Export audit logs to CSV
r.get("/export", asyncHandler(exportAuditLogsHandler));

export default r;