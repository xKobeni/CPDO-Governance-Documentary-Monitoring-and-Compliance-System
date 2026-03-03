import { pool } from "../config/db.js";

/**
 * Creates a submission for (year, office, checklist_item).
 * Assumes you already know template_id and governance_area_id from the item/template.
 */
export async function createSubmission(payload) {
  const {
    year, officeId, governanceAreaId, templateId, checklistItemId,
    submittedBy, officeRemarks
  } = payload;

  const { rows } = await pool.query(
    `INSERT INTO submissions
      (year, office_id, governance_area_id, template_id, checklist_item_id,
       status, submitted_by, office_remarks)
     VALUES ($1,$2,$3,$4,$5,'PENDING',$6,$7)
     ON CONFLICT (year, office_id, checklist_item_id)
     DO UPDATE SET
       submitted_by = EXCLUDED.submitted_by,
       submitted_at = now(),
       office_remarks = EXCLUDED.office_remarks
     RETURNING *`,
    [year, officeId, governanceAreaId, templateId, checklistItemId, submittedBy, officeRemarks ?? null]
  );

  return rows[0];
}

export async function getSubmissionById(id) {
  const { rows } = await pool.query(
    `SELECT s.*,
            o.name as office_name,
            ga.code as governance_code, ga.name as governance_name,
            t.title as template_title,
            ci.item_code, ci.title as item_title
     FROM submissions s
     JOIN offices o ON o.id = s.office_id
     JOIN governance_areas ga ON ga.id = s.governance_area_id
     JOIN checklist_templates t ON t.id = s.template_id
     JOIN checklist_items ci ON ci.id = s.checklist_item_id
     WHERE s.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function setSubmissionStatus({ submissionId, status }) {
  const { rows } = await pool.query(
    `UPDATE submissions
     SET status = $2
     WHERE id = $1
     RETURNING id, status, updated_at`,
    [submissionId, status]
  );
  return rows[0] || null;
}

export async function listSubmissions(filters = {}) {
  const { year, governanceAreaId, officeId, status } = filters;

  const params = [];
  const where = [];
  if (year) { params.push(year); where.push(`s.year = $${params.length}`); }
  if (governanceAreaId) { params.push(governanceAreaId); where.push(`s.governance_area_id = $${params.length}`); }
  if (officeId) { params.push(officeId); where.push(`s.office_id = $${params.length}`); }
  if (status) { params.push(status); where.push(`s.status = $${params.length}`); }

  const { rows } = await pool.query(
    `SELECT s.id, s.year, s.status, s.submitted_at,
            o.name as office_name,
            ga.code as governance_code,
            ci.item_code, ci.title as item_title
     FROM submissions s
     JOIN offices o ON o.id = s.office_id
     JOIN governance_areas ga ON ga.id = s.governance_area_id
     JOIN checklist_items ci ON ci.id = s.checklist_item_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY s.submitted_at DESC`,
    params
  );

  return rows;
}