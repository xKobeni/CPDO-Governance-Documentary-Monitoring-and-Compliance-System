import { pool } from "../config/db.js";

export async function listGovernanceAreas() {
  const { rows } = await pool.query(
    `SELECT id, code, name, description, sort_order, is_active, created_at, updated_at
     FROM governance_areas
     ORDER BY sort_order, code`
  );
  return rows;
}

export async function getGovernanceAreaById(id) {
  const { rows } = await pool.query(
    `SELECT id, code, name, description, sort_order, is_active, created_at, updated_at
     FROM governance_areas
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createGovernanceArea({ code, name, description, sortOrder }) {
  const { rows } = await pool.query(
    `INSERT INTO governance_areas (code, name, description, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [code, name, description ?? null, sortOrder ?? 0]
  );
  return rows[0];
}

export async function updateGovernanceArea(id, updates) {
  const fields = [];
  const values = [];
  let i = 1;

  if (updates.code !== undefined)        { fields.push(`code = $${i++}`);        values.push(updates.code); }
  if (updates.name !== undefined)        { fields.push(`name = $${i++}`);        values.push(updates.name); }
  if (updates.description !== undefined) { fields.push(`description = $${i++}`); values.push(updates.description); }
  if (updates.sortOrder !== undefined)   { fields.push(`sort_order = $${i++}`);  values.push(updates.sortOrder); }
  if (updates.isActive !== undefined)    { fields.push(`is_active = $${i++}`);   values.push(updates.isActive); }

  if (fields.length === 0) return getGovernanceAreaById(id);

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE governance_areas SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteGovernanceArea(id) {
  const { rows } = await pool.query(
    `DELETE FROM governance_areas WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows[0] || null;
}

export async function listGovernanceAreasWithStats(year) {
  const { rows } = await pool.query(
    `SELECT
      ga.id, ga.code, ga.name, ga.description, ga.sort_order, ga.is_active,
      ga.created_at, ga.updated_at,
      COALESCE(tpl.template_count, 0)::int AS templates,
      COALESCE(sub.submission_count, 0)::int AS submissions,
      COALESCE(pend.pending_review_count, 0)::int AS pending_review_count,
      COALESCE(oa.offices_compliant, 0)::int AS offices_compliant,
      (SELECT COUNT(*)::int FROM offices WHERE is_active = TRUE) AS offices_total
    FROM governance_areas ga
    LEFT JOIN (
      SELECT governance_area_id, COUNT(*)::int AS template_count
      FROM checklist_templates
      WHERE year = $1 AND status = 'ACTIVE'
      GROUP BY governance_area_id
    ) tpl ON tpl.governance_area_id = ga.id
    LEFT JOIN (
      SELECT governance_area_id, COUNT(*)::int AS submission_count
      FROM submissions
      WHERE year = $1
      GROUP BY governance_area_id
    ) sub ON sub.governance_area_id = ga.id
    LEFT JOIN (
      SELECT governance_area_id, COUNT(*)::int AS pending_review_count
      FROM submissions
      WHERE year = $1 AND status = 'PENDING'
      GROUP BY governance_area_id
    ) pend ON pend.governance_area_id = ga.id
    LEFT JOIN (
      SELECT governance_area_id, COUNT(DISTINCT office_id)::int AS offices_compliant
      FROM submissions
      WHERE year = $1 AND status = 'APPROVED'
      GROUP BY governance_area_id
    ) oa ON oa.governance_area_id = ga.id
    ORDER BY ga.sort_order, ga.code`,
    [year]
  );
  return rows;
}

export async function getComplianceMatrix(year) {
  const { rows } = await pool.query(
    `SELECT
      s.governance_area_id,
      s.office_id,
      CASE
        WHEN COUNT(*) FILTER (WHERE s.status = 'DENIED') > 0 THEN 'DENIED'
        WHEN COUNT(*) FILTER (WHERE s.status = 'REVISION_REQUESTED') > 0 THEN 'REVISION_REQUESTED'
        WHEN COUNT(*) FILTER (WHERE s.status = 'PENDING') > 0 THEN 'PENDING'
        ELSE 'APPROVED'
      END AS status
    FROM submissions s
    WHERE s.year = $1
    GROUP BY s.governance_area_id, s.office_id
    ORDER BY s.governance_area_id, s.office_id`,
    [year]
  );
  return rows;
}