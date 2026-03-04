import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { shortCache } from "../middlewares/caching.js";
import { summaryHandler, noUploadHandler } from "../controllers/reports.controller.js";

const r = Router();

r.use(requireAuth);

// STAFF/ADMIN can view all, OFFICE only their own (controller restricts)
r.get("/summary", requireRole("OFFICE", "STAFF", "ADMIN"), shortCache, summaryHandler);
r.get("/no-upload", requireRole("OFFICE", "STAFF", "ADMIN"), shortCache, noUploadHandler);

export default r;