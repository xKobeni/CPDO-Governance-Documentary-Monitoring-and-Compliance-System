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
       status = 'PENDING',
       submitted_by = EXCLUDED.submitted_by,
       submitted_at = now(),
       office_remarks = EXCLUDED.office_remarks
     WHERE submissions.status NOT IN ('PENDING', 'APPROVED')
     RETURNING *`,
    [year, officeId, governanceAreaId, templateId, checklistItemId, submittedBy, officeRemarks ?? null]
  );

  return rows[0] || null;
}

export async function getSubmissionById(id) {
  const { rows } = await pool.query(
    `SELECT s.*,
            o.name as office_name,
            ga.code as governance_code, ga.name as governance_name,
            t.title as template_title,
            ci.item_code, ci.title as item_title,
            ci.allowed_file_types, ci.max_files
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

export async function touchSubmissionSubmittedBy({ submissionId, submittedBy }) {
  const { rows } = await pool.query(
    `UPDATE submissions
     SET submitted_by = $2,
         submitted_at = now()
     WHERE id = $1
     RETURNING id, submitted_by, submitted_at`,
    [submissionId, submittedBy]
  );
  return rows[0] || null;
}

export async function listSubmissions(filters = {}, limit = 20, offset = 0) {
  const { year, governanceAreaId, officeId, status } = filters;

  const params = [];
  const where = [];
  if (year) { params.push(year); where.push(`s.year = $${params.length}`); }
  if (governanceAreaId) { params.push(governanceAreaId); where.push(`s.governance_area_id = $${params.length}`); }
  if (officeId) { params.push(officeId); where.push(`s.office_id = $${params.length}`); }
  if (status) { params.push(status); where.push(`s.status = $${params.length}`); }

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM submissions s ${where.length ? "WHERE " + where.join(" AND ") : ""}`;
  const { rows: countRows } = await pool.query(countQuery, params);
  const total = parseInt(countRows[0].total, 10);

  // Get paginated data
  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT s.id, s.year, s.status, s.submitted_at,
            o.name as office_name,
            ga.code as governance_code,
            ci.item_code, ci.title as item_title,
            (SELECT COUNT(*)::int FROM submission_comments sc WHERE sc.submission_id = s.id) AS comment_count
     FROM submissions s
     JOIN offices o ON o.id = s.office_id
     JOIN governance_areas ga ON ga.id = s.governance_area_id
     JOIN checklist_items ci ON ci.id = s.checklist_item_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY s.submitted_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows, total };
}