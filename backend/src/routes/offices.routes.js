import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { audit } from "../middlewares/audit.js";
import { mediumCache, shortCache } from "../middlewares/caching.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  createOfficeHandler,
  listOfficesHandler,
  getOfficeHandler,
  updateOfficeHandler,
  setOfficeActiveHandler,
  deleteOfficeHandler,
} from "../controllers/offices.controller.js";
import {
  listOfficeAssignmentsHandler,
  setOfficeAssignmentsHandler,
  getOfficeChecklistHandler,
  listAllAssignmentsHandler,
} from "../controllers/assignments.controller.js";

const r = Router();

// All office routes require authentication
r.use(requireAuth, checkSessionInactivity);

// ── Office CRUD (ADMIN only) ────────────────────────────────────────────────

// CREATE
r.post(
  "/",
  requireRole("ADMIN"),
  audit("CREATE_OFFICE", "OFFICE", null, (req) => ({ name: req.body.name, code: req.body.code })),
  asyncHandler(createOfficeHandler)
);

// READ - List all offices (staff can view for reference)
r.get("/", requireRole("ADMIN", "STAFF"), mediumCache, asyncHandler(listOfficesHandler));

// READ - Admin overview of all assignments for a year
r.get("/all-assignments", requireRole("ADMIN"), shortCache, asyncHandler(listAllAssignmentsHandler));

// READ - Get single office by ID (staff can view)
r.get("/:id", requireRole("ADMIN", "STAFF"), mediumCache, asyncHandler(getOfficeHandler));

// UPDATE - Update office details
r.patch(
  "/:id",
  requireRole("ADMIN"),
  audit("UPDATE_OFFICE", "OFFICE", (req) => req.params.id, (req) => req.body),
  asyncHandler(updateOfficeHandler)
);

// UPDATE - Set office active status
r.patch(
  "/:id/active",
  requireRole("ADMIN"),
  audit("SET_OFFICE_ACTIVE", "OFFICE", (req) => req.params.id, (req) => req.body),
  asyncHandler(setOfficeActiveHandler)
);

// DELETE
r.delete(
  "/:id",
  requireRole("ADMIN"),
  audit("DELETE_OFFICE", "OFFICE", (req) => req.params.id, (req) => ({ targetId: req.params.id })),
  asyncHandler(deleteOfficeHandler)
);

// ── Governance Assignments (ADMIN manages, OFFICE reads own) ─────────────────

// READ - Get assignments for an office (admin overview)
r.get("/:id/assignments", requireRole("ADMIN"), shortCache, asyncHandler(listOfficeAssignmentsHandler));

// PUT - Bulk-replace assignments for an office (admin only)
r.put(
  "/:id/assignments",
  requireRole("ADMIN"),
  audit("SET_OFFICE_ASSIGNMENTS", "OFFICE", (req) => req.params.id, (req) => ({ year: req.body.year, count: req.body.governanceAreaIds?.length })),
  asyncHandler(setOfficeAssignmentsHandler)
);

// READ - Get full checklist for an office (accessible by ADMIN and OFFICE role for their own office)
r.get("/:id/checklist", requireRole("ADMIN", "OFFICE"), shortCache, asyncHandler(getOfficeChecklistHandler));

export default r;
