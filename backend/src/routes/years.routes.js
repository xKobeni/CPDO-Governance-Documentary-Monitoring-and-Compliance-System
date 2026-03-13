import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  listYearsHandler,
  createYearHandler,
  updateYearHandler,
} from "../controllers/years.controller.js";

const r = Router();

r.use(requireAuth, checkSessionInactivity);

// List years – any authenticated role can read
r.get("/", asyncHandler(listYearsHandler));

// Manage years – ADMIN only
r.post("/", requireRole("ADMIN"), asyncHandler(createYearHandler));
r.patch("/:id", requireRole("ADMIN"), asyncHandler(updateYearHandler));

export default r;

