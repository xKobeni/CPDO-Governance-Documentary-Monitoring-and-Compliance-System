import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { audit } from "../middlewares/audit.js";
import { longCache } from "../middlewares/caching.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  listTemplatesByYearHandler,
  createTemplateHandler,
  listTemplateItemsHandler,
  createChecklistItemHandler
} from "../controllers/templates.controller.js";

const r = Router();

r.use(requireAuth);

// read: ADMIN/STAFF/OFFICE - cached for 1 hour
r.get("/", longCache, asyncHandler(listTemplatesByYearHandler));
r.get("/:templateId/items", longCache, asyncHandler(listTemplateItemsHandler));

// write: ADMIN only
r.post("/", requireRole("ADMIN"), audit("CREATE_TEMPLATE", "TEMPLATE"), asyncHandler(createTemplateHandler));
r.post("/:templateId/items", requireRole("ADMIN"), audit("CREATE_CHECKLIST_ITEM", "CHECKLIST_ITEM", (req) => req.params.templateId), asyncHandler(createChecklistItemHandler));

export default r;