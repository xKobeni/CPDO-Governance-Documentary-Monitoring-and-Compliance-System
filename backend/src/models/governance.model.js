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
    `WITH assigned_offices_totals AS (
      SELECT
        oga.governance_area_id,
        COUNT(DISTINCT oga.office_id)::int AS offices_total
      FROM office_governance_assignments oga
      JOIN offices o
        ON o.id = oga.office_id
       AND o.is_active = TRUE
      WHERE oga.year = $1
      GROUP BY oga.governance_area_id
    ),
    compliant_by_assignment AS (
      SELECT
        base.governance_area_id,
        COUNT(*)::int AS offices_compliant
      FROM (
        SELECT
          oga.office_id,
          oga.governance_area_id,
          COUNT(ci.id)::int AS required_count,
          COUNT(DISTINCT s.checklist_item_id) FILTER (WHERE s.status = 'APPROVED')::int AS approved_required_count
        FROM office_governance_assignments oga
        JOIN offices o
          ON o.id = oga.office_id
         AND o.is_active = TRUE
        LEFT JOIN checklist_templates ct
          ON ct.governance_area_id = oga.governance_area_id
         AND ct.year = oga.year
        LEFT JOIN checklist_items ci
          ON ci.template_id = ct.id
         AND ci.is_required = TRUE
        LEFT JOIN submissions s
          ON s.year = oga.year
         AND s.office_id = oga.office_id
         AND s.governance_area_id = oga.governance_area_id
         AND s.checklist_item_id = ci.id
        WHERE oga.year = $1
        GROUP BY oga.office_id, oga.governance_area_id
      ) base
      WHERE base.required_count > 0
        AND base.approved_required_count >= base.required_count
      GROUP BY base.governance_area_id
    )
    SELECT
      ga.id, ga.code, ga.name, ga.description, ga.sort_order, ga.is_active,
      ga.created_at, ga.updated_at,
      COALESCE(tpl.template_count, 0)::int AS templates,
      COALESCE(sub.submission_count, 0)::int AS submissions,
      COALESCE(pend.pending_review_count, 0)::int AS pending_review_count,
      COALESCE(cba.offices_compliant, 0)::int AS offices_compliant,
      COALESCE(aot.offices_total, 0)::int AS offices_total
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
    LEFT JOIN assigned_offices_totals aot ON aot.governance_area_id = ga.id
    LEFT JOIN compliant_by_assignment cba ON cba.governance_area_id = ga.id
    ORDER BY ga.sort_order, ga.code`,
    [year]
  );
  return rows;
}

export async function getComplianceMatrix(year) {
  const { rows } = await pool.query(
    `WITH assignment_base AS (
      SELECT
        oga.office_id,
        oga.governance_area_id,
        oga.year
      FROM office_governance_assignments oga
      JOIN offices o
        ON o.id = oga.office_id
       AND o.is_active = TRUE
      WHERE oga.year = $1
    ),
    required_counts AS (
      SELECT
        ab.office_id,
        ab.governance_area_id,
        COUNT(ci.id)::int AS required_count
      FROM assignment_base ab
      LEFT JOIN checklist_templates ct
        ON ct.governance_area_id = ab.governance_area_id
       AND ct.year = ab.year
      LEFT JOIN checklist_items ci
        ON ci.template_id = ct.id
       AND ci.is_required = TRUE
      GROUP BY ab.office_id, ab.governance_area_id
    ),
    submission_rollup AS (
      SELECT
        ab.office_id,
        ab.governance_area_id,
        COUNT(s.id)::int AS any_submission_count,
        COUNT(*) FILTER (WHERE s.status = 'DENIED')::int AS denied_count,
        COUNT(*) FILTER (WHERE s.status = 'REVISION_REQUESTED')::int AS revision_count,
        COUNT(*) FILTER (WHERE s.status = 'PENDING')::int AS pending_count,
        COUNT(DISTINCT s.checklist_item_id) FILTER (
          WHERE s.status = 'APPROVED'
            AND ci.is_required = TRUE
        )::int AS approved_required_count
      FROM assignment_base ab
      LEFT JOIN submissions s
        ON s.year = ab.year
       AND s.office_id = ab.office_id
       AND s.governance_area_id = ab.governance_area_id
      LEFT JOIN checklist_items ci
        ON ci.id = s.checklist_item_id
      LEFT JOIN checklist_templates ct
        ON ct.id = ci.template_id
      GROUP BY ab.office_id, ab.governance_area_id
    )
    SELECT
      ab.governance_area_id,
      ab.office_id,
      CASE
        WHEN COALESCE(sr.denied_count, 0) > 0 THEN 'DENIED'
        WHEN COALESCE(sr.revision_count, 0) > 0 THEN 'REVISION_REQUESTED'
        WHEN COALESCE(sr.pending_count, 0) > 0 THEN 'PENDING'
        -- Treat zero-required assignments as not started in matrix UI
        -- to keep the status set simple for end users.
        WHEN COALESCE(rc.required_count, 0) = 0 THEN 'NOT_STARTED'
        WHEN COALESCE(rc.required_count, 0) > 0
         AND COALESCE(sr.approved_required_count, 0) >= rc.required_count THEN 'APPROVED'
        WHEN COALESCE(sr.any_submission_count, 0) > 0 THEN 'IN_PROGRESS'
        ELSE 'NOT_STARTED'
      END AS status
    FROM assignment_base ab
    LEFT JOIN required_counts rc
      ON rc.office_id = ab.office_id
     AND rc.governance_area_id = ab.governance_area_id
    LEFT JOIN submission_rollup sr
      ON sr.office_id = ab.office_id
     AND sr.governance_area_id = ab.governance_area_id
    ORDER BY ab.governance_area_id, ab.office_id`,
    [year]
  );
  return rows;
}