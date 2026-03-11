import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { audit } from "../middlewares/audit.js";
import { longCache, shortCache } from "../middlewares/caching.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  listGovernanceAreasHandler,
  getGovernanceAreaHandler,
  createGovernanceAreaHandler,
  updateGovernanceAreaHandler,
  deleteGovernanceAreaHandler,
  areasWithStatsHandler,
  complianceMatrixHandler,
} from "../controllers/governance.controller.js";

import { listOfficesForAreaHandler } from "../controllers/assignments.controller.js";

const r = Router();

r.use(requireAuth, checkSessionInactivity);

// READ - ADMIN/STAFF/OFFICE (cached 1 hour - static reference data)
r.get("/",                  longCache,  asyncHandler(listGovernanceAreasHandler));
r.get("/stats",             shortCache, asyncHandler(areasWithStatsHandler));
r.get("/compliance-matrix", shortCache, asyncHandler(complianceMatrixHandler));
r.get("/:id",               longCache,  asyncHandler(getGovernanceAreaHandler));

// READ - assigned offices for a governance area (admin only)
r.get("/:id/assigned-offices", requireRole("ADMIN"), shortCache, asyncHandler(listOfficesForAreaHandler));

// WRITE - ADMIN only
r.post(
  "/",
  requireRole("ADMIN"),
  audit("CREATE_GOVERNANCE_AREA", "GOVERNANCE_AREA", null, (req) => ({ code: req.body.code, name: req.body.name })),
  asyncHandler(createGovernanceAreaHandler)
);

r.patch(
  "/:id",
  requireRole("ADMIN"),
  audit("UPDATE_GOVERNANCE_AREA", "GOVERNANCE_AREA", (req) => req.params.id, (req) => req.body),
  asyncHandler(updateGovernanceAreaHandler)
);

r.delete(
  "/:id",
  requireRole("ADMIN"),
  audit("DELETE_GOVERNANCE_AREA", "GOVERNANCE_AREA", (req) => req.params.id, () => null),
  asyncHandler(deleteGovernanceAreaHandler)
);

export default r;
