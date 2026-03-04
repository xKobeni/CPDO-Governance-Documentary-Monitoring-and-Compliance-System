import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { audit } from "../middlewares/audit.js";
import { shortCache } from "../middlewares/caching.js";
import {
  createSubmissionHandler,
  getSubmissionHandler,
  listSubmissionsHandler,
  reviewSubmissionHandler
} from "../controllers/submissions.controller.js";

const r = Router();

r.use(requireAuth);

// OFFICE/STAFF/ADMIN can create + view list (OFFICE auto restricted)
r.post("/", audit("CREATE_SUBMISSION", "SUBMISSION"), createSubmissionHandler);
r.get("/", shortCache, listSubmissionsHandler);
r.get("/:id", shortCache, getSubmissionHandler);

// Review only STAFF/ADMIN
r.post("/:id/review", requireRole("STAFF", "ADMIN"), audit("REVIEW_SUBMISSION", "SUBMISSION", (req) => req.params.id), reviewSubmissionHandler);

export default r;