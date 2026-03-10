import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { audit } from "../middlewares/audit.js";
import { mediumCache } from "../middlewares/caching.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  createOfficeHandler,
  listOfficesHandler,
  getOfficeHandler,
  updateOfficeHandler,
  setOfficeActiveHandler,
  deleteOfficeHandler,
} from "../controllers/offices.controller.js";

const r = Router();

// All office management routes require authentication and ADMIN role
r.use(requireAuth, requireRole("ADMIN"));

// CREATE - Create a new office
r.post(
  "/",
  audit("CREATE_OFFICE", "OFFICE", null, (req) => ({ name: req.body.name, code: req.body.code })),
  asyncHandler(createOfficeHandler)
);

// READ - List all offices
r.get("/", mediumCache, asyncHandler(listOfficesHandler));

// READ - Get single office by ID
r.get("/:id", mediumCache, asyncHandler(getOfficeHandler));

// UPDATE - Update office details
r.patch(
  "/:id",
  audit("UPDATE_OFFICE", "OFFICE", (req) => req.params.id, (req) => req.body),
  asyncHandler(updateOfficeHandler)
);

// UPDATE - Set office active status
r.patch(
  "/:id/active",
  audit("SET_OFFICE_ACTIVE", "OFFICE", (req) => req.params.id, (req) => req.body),
  asyncHandler(setOfficeActiveHandler)
);

// DELETE - Delete an office
r.delete(
  "/:id",
  audit("DELETE_OFFICE", "OFFICE", (req) => req.params.id, (req) => ({ targetId: req.params.id })),
  asyncHandler(deleteOfficeHandler)
);

export default r;
