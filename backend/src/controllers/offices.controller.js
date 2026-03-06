import { z } from "zod";
import {
  createOffice,
  listOffices,
  getOfficeById,
  updateOffice,
  setOfficeActive,
  deleteOffice,
} from "../models/offices.model.js";

/**
 * Validation schema for creating an office
 */
const createOfficeSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  name: z.string().min(3).max(200),
  contactEmail: z.string().email().nullable().optional(),
});

/**
 * Validation schema for updating an office
 */
const updateOfficeSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase().optional(),
  name: z.string().min(3).max(200).optional(),
  contactEmail: z.string().email().nullable().optional(),
});

/**
 * Validation schema for setting office active status
 */
const setActiveSchema = z.object({
  isActive: z.boolean(),
});

/**
 * Create a new office
 * @route POST /offices
 */
export async function createOfficeHandler(req, res) {
  const parsed = createOfficeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid input",
      errors: parsed.error.flatten(),
    });
  }

  const { code, name, contactEmail } = parsed.data;

  try {
    const office = await createOffice({
      code,
      name,
      contactEmail: contactEmail || null,
    });
    return res.status(201).json({ office });
  } catch (err) {
    if (err.code === "23505") {
      // Unique constraint violation
      return res.status(409).json({ message: "Office code already exists" });
    }
    throw err;
  }
}

/**
 * List all offices with user count
 * @route GET /offices
 */
export async function listOfficesHandler(req, res) {
  const offices = await listOffices();
  return res.json({ data: offices, total: offices.length });
}

/**
 * Get a single office by ID
 * @route GET /offices/:id
 */
export async function getOfficeHandler(req, res) {
  const office = await getOfficeById(req.params.id);
  if (!office) {
    return res.status(404).json({ message: "Office not found" });
  }
  return res.json({ office });
}

/**
 * Update office details
 * @route PATCH /offices/:id
 */
export async function updateOfficeHandler(req, res) {
  const parsed = updateOfficeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid input",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const office = await updateOffice(req.params.id, parsed.data);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }
    return res.json({ office });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Office code already exists" });
    }
    throw err;
  }
}

/**
 * Set office active status
 * @route PATCH /offices/:id/active
 */
export async function setOfficeActiveHandler(req, res) {
  const parsed = setActiveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input" });
  }

  const office = await setOfficeActive(req.params.id, parsed.data.isActive);
  if (!office) {
    return res.status(404).json({ message: "Office not found" });
  }
  return res.json({ office });
}

/**
 * Delete an office
 * @route DELETE /offices/:id
 */
export async function deleteOfficeHandler(req, res) {
  try {
    const deleted = await deleteOffice(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Office not found" });
    }
    return res.json({ message: "Office deleted successfully" });
  } catch (err) {
    if (err.code === "23503") {
      // Foreign key constraint violation
      return res.status(409).json({
        message: "Cannot delete office with associated users",
      });
    }
    throw err;
  }
}
