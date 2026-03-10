import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { audit } from "../middlewares/audit.js";
import { shortCache } from "../middlewares/caching.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  createSubmissionHandler,
  getSubmissionHandler,
  listSubmissionsHandler,
  reviewSubmissionHandler
} from "../controllers/submissions.controller.js";
import commentsRoutes from "./comments.routes.js";

const r = Router();

r.use(requireAuth);

// OFFICE/STAFF/ADMIN can create + view list (OFFICE auto restricted)
r.post("/", audit("CREATE_SUBMISSION", "SUBMISSION", null, (req) => ({ templateId: req.body.templateId, title: req.body.title })), asyncHandler(createSubmissionHandler));
r.get("/", shortCache, asyncHandler(listSubmissionsHandler));
r.get("/:id", shortCache, asyncHandler(getSubmissionHandler));

// Review only STAFF/ADMIN
r.post("/:id/review", requireRole("STAFF", "ADMIN"), audit("REVIEW_SUBMISSION", "SUBMISSION", (req) => req.params.id), asyncHandler(reviewSubmissionHandler));

// Comments nested under submission ID
r.use("/:submissionId/comments", commentsRoutes);

export default r;