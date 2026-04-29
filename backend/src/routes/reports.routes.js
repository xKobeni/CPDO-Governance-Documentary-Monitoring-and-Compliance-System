import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { shortCache } from "../middlewares/caching.js";
import {
  summaryHandler,
  noUploadHandler,
  complianceProgressHandler,
  complianceProgressExportHandler,
} from "../controllers/reports.controller.js";

const r = Router();

r.use(requireAuth, checkSessionInactivity);

// STAFF/ADMIN can view all, OFFICE only their own (controller restricts)
r.get("/summary", requireRole("OFFICE", "STAFF", "ADMIN"), shortCache, summaryHandler);
r.get("/no-upload", requireRole("OFFICE", "STAFF", "ADMIN"), shortCache, noUploadHandler);
r.get("/compliance-progress", requireRole("OFFICE", "STAFF", "ADMIN"), shortCache, complianceProgressHandler);
r.get("/compliance-progress/export", requireRole("OFFICE", "STAFF", "ADMIN"), complianceProgressExportHandler);

export default r;