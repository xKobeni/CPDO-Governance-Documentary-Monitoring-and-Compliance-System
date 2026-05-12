import { z } from "zod";
import * as AssignmentsModel from "../models/assignments.model.js";
import { getOfficeById } from "../models/offices.model.js";
import { getGovernanceAreaById } from "../models/governance.model.js";

/* -------------------------------------------------------------------------- */
/*  Validation schemas                                                          */
/* -------------------------------------------------------------------------- */

const yearSchema = z
  .string()
  .regex(/^\d{4}$/, "year must be a 4-digit number")
  .transform(Number);

const setAssignmentsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  governanceAreaIds: z.array(z.string().uuid()).min(0),
});

/* -------------------------------------------------------------------------- */
/*  Handlers                                                                    */
/* -------------------------------------------------------------------------- */

/** GET /offices/:id/assignments?year=YYYY */
export async function listOfficeAssignmentsHandler(req, res) {
  const { id: officeId } = req.params;
  const yearParsed = yearSchema.safeParse(req.query.year ?? String(new Date().getFullYear()));
  if (!yearParsed.success) return res.status(400).json({ error: yearParsed.error.issues[0].message });

  const office = await getOfficeById(officeId);
  if (!office) return res.status(404).json({ error: "Office not found" });

  const assignments = await AssignmentsModel.getAssignmentsForOffice(officeId, yearParsed.data);
  return res.json({ data: assignments });
}

/** PUT /offices/:id/assignments — bulk-replace all assignments for the office+year */
export async function setOfficeAssignmentsHandler(req, res) {
  const { id: officeId } = req.params;
  const parsed = setAssignmentsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const { year } = parsed.data;
  const governanceAreaIds = Array.from(new Set(parsed.data.governanceAreaIds));

  const office = await getOfficeById(officeId);
  if (!office) return res.status(404).json({ error: "Office not found" });

  // Validate all governance area IDs exist
  for (const gaId of governanceAreaIds) {
    const ga = await getGovernanceAreaById(gaId);
    if (!ga) {
      return res.status(404).json({ error: `Governance area not found: ${gaId}` });
    }
  }

  // Block assignment to areas that are not assignable for this year
  const readiness = await AssignmentsModel.getGovernanceAssignmentReadinessByIds(year, governanceAreaIds);
  const invalidSelections = readiness.filter((r) => !r.is_assignable);
  if (invalidSelections.length > 0) {
    return res.status(400).json({
      error: "Some governance areas cannot be assigned for the selected year",
      details: invalidSelections.map((r) => ({
        governanceAreaId: r.id,
        code: r.code,
        name: r.name,
        reason: r.unassignable_reason,
      })),
    });
  }

  const assignments = await AssignmentsModel.setAssignmentsForOffice({
    officeId,
    year,
    governanceAreaIds,
    assignedBy: req.user?.sub ?? null,
  });

  return res.json({ message: "Assignments updated", data: assignments });
}

/** GET /offices/assignment-options?year=YYYY — governance list with assignment readiness */
export async function listAssignmentOptionsHandler(req, res) {
  const yearParsed = yearSchema.safeParse(req.query.year ?? String(new Date().getFullYear()));
  if (!yearParsed.success) return res.status(400).json({ error: yearParsed.error.issues[0].message });

  const options = await AssignmentsModel.listGovernanceAssignmentOptions(yearParsed.data);
  return res.json({ year: yearParsed.data, data: options });
}

/** GET /offices/:id/checklist?year=YYYY — used by Office Head */
export async function getOfficeChecklistHandler(req, res) {
  const { id: officeId } = req.params;
  const yearParsed = yearSchema.safeParse(req.query.year ?? String(new Date().getFullYear()));
  if (!yearParsed.success) return res.status(400).json({ error: yearParsed.error.issues[0].message });

  // OFFICE users may only view their own office checklist
  if (req.user?.role === "OFFICE" && req.user?.officeId !== officeId) {
    return res.status(403).json({ error: "Access denied" });
  }

  const office = await getOfficeById(officeId);
  if (!office) return res.status(404).json({ error: "Office not found" });

  const items = await AssignmentsModel.getChecklistItemsForOffice(officeId, yearParsed.data);

  // Group by governance area for a convenient frontend shape
  const areasMap = {};
  for (const row of items) {
    if (!areasMap[row.governance_area_id]) {
      areasMap[row.governance_area_id] = {
        id: row.governance_area_id,
        code: row.governance_code,
        name: row.governance_name,
        sortOrder: row.governance_sort_order,
        items: [],
      };
    }
    // When an area is assigned but no ACTIVE template/items exist yet,
    // the left joins will produce rows with null item_id. Still return the area.
    if (row.item_id) {
      areasMap[row.governance_area_id].items.push({
        id: row.item_id,
        parentItemId: row.parent_item_id,
        itemCode: row.item_code,
        title: row.item_title,
        description: row.item_description,
        isRequired: row.is_required,
        frequency: row.frequency,
        dueDate: row.due_date,
        enableReminder: row.enable_reminder,
        reminderDaysBefore: row.reminder_days_before,
        allowedFileTypes: row.allowed_file_types ?? null,
        maxFiles: row.max_files ?? null,
        sortOrder: row.item_sort_order,
        submission: row.submission_id
          ? {
              id: row.submission_id,
              status: row.submission_status,
              submittedAt: row.submitted_at,
              officeRemarks: row.office_remarks,
              commentCount: Number(row.submission_comment_count ?? 0),
            }
          : null,
      });
    }
  }

  const areas = Object.values(areasMap).sort((a, b) => a.sortOrder - b.sortOrder);
  return res.json({ data: { office, year: yearParsed.data, areas } });
}

/** GET /governance-areas/:id/assigned-offices?year=YYYY — which offices are assigned to this area */
export async function listOfficesForAreaHandler(req, res) {
  const { id: governanceAreaId } = req.params;
  const yearParsed = yearSchema.safeParse(req.query.year ?? String(new Date().getFullYear()));
  if (!yearParsed.success) return res.status(400).json({ error: yearParsed.error.issues[0].message });

  const rows = await AssignmentsModel.getOfficesForGovernanceArea(governanceAreaId, yearParsed.data);
  return res.json({ data: rows });
}

/** GET /offices/all-assignments?year=YYYY — admin overview */
export async function listAllAssignmentsHandler(req, res) {
  const yearParsed = yearSchema.safeParse(req.query.year ?? String(new Date().getFullYear()));
  if (!yearParsed.success) return res.status(400).json({ error: yearParsed.error.issues[0].message });

  const assignments = await AssignmentsModel.listAllAssignments(yearParsed.data);
  return res.json({ data: assignments });
}
