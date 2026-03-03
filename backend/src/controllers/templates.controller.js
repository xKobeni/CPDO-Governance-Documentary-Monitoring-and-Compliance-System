import { z } from "zod";
import {
  createTemplate, getTemplateByGovYear, listTemplatesByYear,
  createChecklistItem, listTemplateItems
} from "../models/templates.model.js";

export async function listTemplatesByYearHandler(req, res) {
  const year = Number(req.query.year);
  if (!year) return res.status(400).json({ message: "year is required" });
  const templates = await listTemplatesByYear(year);
  return res.json({ templates });
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

export async function listTemplateItemsHandler(req, res) {
  const templateId = req.params.templateId;
  const items = await listTemplateItems(templateId);
  return res.json({ items });
}

const createItemSchema = z.object({
  parentItemId: z.string().uuid().nullable().optional(),
  itemCode: z.string().min(1),
  title: z.string().min(2),
  description: z.string().nullable().optional(),
  isRequired: z.boolean().optional(),
  frequency: z.enum(["ANNUAL", "SEMI_ANNUAL", "QUARTERLY", "MONTHLY", "ONE_TIME"]).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), // YYYY-MM-DD
  allowedFileTypes: z.array(z.string()).nullable().optional(),
  maxFiles: z.number().int().min(1).max(20).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function createChecklistItemHandler(req, res) {
  const templateId = req.params.templateId;
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });

  const item = await createChecklistItem({
    templateId,
    parentItemId: parsed.data.parentItemId ?? null,
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