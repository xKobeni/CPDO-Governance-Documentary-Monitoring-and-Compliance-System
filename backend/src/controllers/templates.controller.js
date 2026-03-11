import { z } from "zod";
import {
  createTemplate, getTemplateByGovYear, getTemplateById,
  listTemplates, updateTemplate, deleteTemplate,
  createChecklistItem, listTemplateItems,
  updateChecklistItem, deleteChecklistItem, getChecklistItemInTemplate,
} from "../models/templates.model.js";

export async function listTemplatesHandler(req, res) {
  const year = req.query.year ? Number(req.query.year) : null;
  if (req.query.year && !year) return res.status(400).json({ message: "year must be a number" });
  const templates = await listTemplates(year);
  return res.json({ templates });
}

export async function getTemplateHandler(req, res) {
  const template = await getTemplateById(req.params.id);
  if (!template) return res.status(404).json({ message: "Template not found" });
  return res.json({ template });
}

const createTemplateSchema = z.object({
  governanceAreaId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  title: z.string().min(2),
  notes: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
});

export async function createTemplateHandler(req, res) {
  const parsed = createTemplateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });

  const existing = await getTemplateByGovYear(parsed.data.governanceAreaId, parsed.data.year);
  if (existing) return res.status(409).json({ message: "Template already exists for that governance+year" });

  const created = await createTemplate({
    ...parsed.data,
    createdBy: req.user?.sub ?? null,
  });

  return res.status(201).json({ template: created });
}

const updateTemplateSchema = z.object({
  governanceAreaId: z.string().uuid().optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  title: z.string().min(2).optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
});

export async function updateTemplateHandler(req, res) {
  const parsed = updateTemplateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });

  const existing = await getTemplateById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Template not found" });

  // Conflict check only when governance area or year is changing
  if (parsed.data.governanceAreaId || parsed.data.year) {
    const newGovId = parsed.data.governanceAreaId ?? existing.governance_area_id;
    const newYear  = parsed.data.year ?? existing.year;
    if (newGovId !== existing.governance_area_id || newYear !== existing.year) {
      const conflict = await getTemplateByGovYear(newGovId, newYear);
      if (conflict && conflict.id !== req.params.id) {
        return res.status(409).json({ message: "Template already exists for that governance+year" });
      }
    }
  }

  const updated = await updateTemplate(req.params.id, parsed.data);
  return res.json({ template: updated });
}

export async function deleteTemplateHandler(req, res) {
  const existing = await getTemplateById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Template not found" });
  await deleteTemplate(req.params.id);
  return res.status(204).end();
}

export async function listTemplateItemsHandler(req, res) {
  const templateId = req.params.templateId;
  const includeInactive = req.query.includeInactive === "true";
  const items = await listTemplateItems(templateId, includeInactive);
  return res.json({ items });
}

const itemSchema = z.object({
  parentItemId: z.string().uuid().nullable().optional(),
  itemCode: z.string().min(1),
  title: z.string().min(2),
  description: z.string().nullable().optional(),
  isRequired: z.boolean().optional(),
  frequency: z.enum(["ANNUAL", "SEMI_ANNUAL", "QUARTERLY", "MONTHLY", "ONE_TIME"]).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  allowedFileTypes: z.array(z.string()).nullable().optional(),
  maxFiles: z.number().int().min(0).max(20).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function createChecklistItemHandler(req, res) {
  const templateId = req.params.templateId;
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });

  // Validate that parentItemId (if given) belongs to the same template
  const parentItemId = parsed.data.parentItemId ?? null;
  if (parentItemId) {
    const parent = await getChecklistItemInTemplate(parentItemId, templateId);
    if (!parent) {
      return res.status(422).json({ message: "Parent item not found in this template. It may have been deleted — please refresh and try again." });
    }
  }

  const item = await createChecklistItem({
    templateId,
    parentItemId,
    itemCode: parsed.data.itemCode,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    isRequired: parsed.data.isRequired ?? true,
    frequency: parsed.data.frequency ?? "ANNUAL",
    dueDate: parsed.data.dueDate ?? null,
    allowedFileTypes: parsed.data.allowedFileTypes ?? null,
    maxFiles: parsed.data.maxFiles ?? 1,
    sortOrder: parsed.data.sortOrder ?? 0,
    isActive: parsed.data.isActive ?? true,
  });

  return res.status(201).json({ item });
}

const updateItemSchema = itemSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: "At least one field is required" }
);

export async function updateChecklistItemHandler(req, res) {
  const { templateId, itemId } = req.params;
  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });

  // Validate parentItemId if it's being changed
  if (parsed.data.parentItemId) {
    const parent = await getChecklistItemInTemplate(parsed.data.parentItemId, templateId);
    if (!parent) {
      return res.status(422).json({ message: "Parent item not found in this template. It may have been deleted — please refresh and try again." });
    }
    // Prevent an item from being its own parent
    if (parsed.data.parentItemId === itemId) {
      return res.status(422).json({ message: "An item cannot be its own parent." });
    }
  }

  const updated = await updateChecklistItem(itemId, parsed.data);
  if (!updated) return res.status(404).json({ message: "Checklist item not found" });
  return res.json({ item: updated });
}

export async function deleteChecklistItemHandler(req, res) {
  const { itemId } = req.params;
  await deleteChecklistItem(itemId);
  return res.status(204).end();
}