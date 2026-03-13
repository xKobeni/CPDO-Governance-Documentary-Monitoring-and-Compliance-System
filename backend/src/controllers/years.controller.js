import { z } from "zod";
import { listYears, createYear, updateYear } from "../models/years.model.js";

const yearSchema = z
  .number()
  .int()
  .min(2000)
  .max(2100);

const createSchema = z.object({
  year: yearSchema,
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  isActive: z.boolean(),
});

export async function listYearsHandler(req, res) {
  const includeInactive = req.query.includeInactive === "true";
  const years = await listYears({ includeInactive });
  return res.json({ years });
}

export async function createYearHandler(req, res) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid input", errors: parsed.error.flatten() });
  }

  try {
    const yearRow = await createYear(parsed.data);
    return res.status(201).json({ year: yearRow });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "Year already exists" });
    }
    throw err;
  }
}

export async function updateYearHandler(req, res) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid input", errors: parsed.error.flatten() });
  }

  const updated = await updateYear(req.params.id, {
    isActive: parsed.data.isActive,
  });
  if (!updated) {
    return res.status(404).json({ message: "Year not found" });
  }
  return res.json({ year: updated });
}

