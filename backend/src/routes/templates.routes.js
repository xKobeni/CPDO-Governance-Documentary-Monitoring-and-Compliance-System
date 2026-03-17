import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { audit } from "../middlewares/audit.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  listTemplatesHandler,
  getTemplateHandler,
  createTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
  copyTemplateHandler,
  listTemplateItemsHandler,
  createChecklistItemHandler,
  updateChecklistItemHandler,
  deleteChecklistItemHandler,
} from "../controllers/templates.controller.js";

const r = Router();

r.use(requireAuth, checkSessionInactivity);

// Templates — read (all roles)
r.get("/",    asyncHandler(listTemplatesHandler));
r.get("/:id", asyncHandler(getTemplateHandler));

// Templates — write (ADMIN only)
r.post("/",
  requireRole("ADMIN"),
  audit("CREATE_TEMPLATE", "TEMPLATE", null, (req) => ({ title: req.body.title, year: req.body.year })),
  asyncHandler(createTemplateHandler)
);
r.patch("/:id",
  requireRole("ADMIN"),
  audit("UPDATE_TEMPLATE", "TEMPLATE", (req) => req.params.id),
  asyncHandler(updateTemplateHandler)
);
r.delete("/:id",
  requireRole("ADMIN"),
  audit("DELETE_TEMPLATE", "TEMPLATE", (req) => req.params.id),
  asyncHandler(deleteTemplateHandler)
);

r.post(
  "/:id/copy",
  requireRole("ADMIN"),
  audit("COPY_TEMPLATE", "TEMPLATE", (req) => req.params.id, (req) => ({ targetYear: req.body.year, targetGov: req.body.governanceAreaId })),
  asyncHandler(copyTemplateHandler)
);

// Checklist items — read (all roles)
r.get("/:templateId/items", asyncHandler(listTemplateItemsHandler));

// Checklist items — write (ADMIN only)
r.post("/:templateId/items",
  requireRole("ADMIN"),
  audit("CREATE_CHECKLIST_ITEM", "CHECKLIST_ITEM", (req) => req.params.templateId),
  asyncHandler(createChecklistItemHandler)
);
r.patch("/:templateId/items/:itemId",
  requireRole("ADMIN"),
  audit("UPDATE_CHECKLIST_ITEM", "CHECKLIST_ITEM", (req) => req.params.itemId),
  asyncHandler(updateChecklistItemHandler)
);
r.delete("/:templateId/items/:itemId",
  requireRole("ADMIN"),
  audit("DELETE_CHECKLIST_ITEM", "CHECKLIST_ITEM", (req) => req.params.itemId),
  asyncHandler(deleteChecklistItemHandler)
);

export default r;