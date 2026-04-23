import { z } from "zod";
import {
  listGovernanceAreas,
  getGovernanceAreaById,
  createGovernanceArea,
  updateGovernanceArea,
  deleteGovernanceArea,
  listGovernanceAreasWithStats,
  getComplianceMatrix,
} from "../models/governance.model.js";

const createSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(3).max(200),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase().optional(),
  name: z.string().min(3).max(200).optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function listGovernanceAreasHandler(req, res) {
  const areas = await listGovernanceAreas();
  return res.json({ governanceAreas: areas });
}

export async function getGovernanceAreaHandler(req, res) {
  const area = await getGovernanceAreaById(req.params.id);
  if (!area) return res.status(404).json({ message: "Governance area not found" });
  return res.json({ governanceArea: area });
}

export async function createGovernanceAreaHandler(req, res) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
  }

  try {
    const area = await createGovernanceArea(parsed.data);
    return res.status(201).json({ governanceArea: area });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Governance area code already exists" });
    }
    throw err;
  }
}

export async function updateGovernanceAreaHandler(req, res) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
  }

  try {
    const area = await updateGovernanceArea(req.params.id, parsed.data);
    if (!area) return res.status(404).json({ message: "Governance area not found" });
    return res.json({ governanceArea: area });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Governance area code already exists" });
    }
    throw err;
  }
}

export async function deleteGovernanceAreaHandler(req, res) {
  try {
    const deleted = await deleteGovernanceArea(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Governance area not found" });
    return res.json({ message: "Governance area deleted successfully" });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(409).json({ message: "Cannot delete governance area with associated templates" });
    }
    throw err;
  }
}

export async function areasWithStatsHandler(req, res) {
  const year = parseInt(req.query.year, 10);
  if (!year || year < 2000 || year > 2100) {
    return res.status(400).json({ message: "Valid year is required (e.g. ?year=2026)" });
  }
  const areas = await listGovernanceAreasWithStats(year);
  return res.json({ governanceAreas: areas, year });
}

export async function complianceMatrixHandler(req, res) {
  const year = parseInt(req.query.year, 10);
  if (!year || year < 2000 || year > 2100) {
    return res.status(400).json({ message: "Valid year is required (e.g. ?year=2026)" });
  }
  const matrix = await getComplianceMatrix(year);
  return res.json(matrix);
}

