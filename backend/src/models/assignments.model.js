import { pool } from "../config/db.js";

/** Get all governance area assignments for a specific office + year */
export async function getAssignmentsForOffice(officeId, year) {
  const { rows } = await pool.query(
    `SELECT
       oga.id,
       oga.office_id,
       oga.governance_area_id,
       oga.year,
       oga.assigned_at,
       ga.code   AS governance_code,
       ga.name   AS governance_name,
       ga.description AS governance_description,
       ga.sort_order,
       ga.is_active AS governance_active
     FROM office_governance_assignments oga
     JOIN governance_areas ga ON ga.id = oga.governance_area_id
     WHERE oga.office_id = $1 AND oga.year = $2
     ORDER BY ga.sort_order, ga.code`,
    [officeId, year]
  );
  return rows;
}

/** Get all offices assigned to a governance area for a year */
export async function getOfficesForGovernanceArea(governanceAreaId, year) {
  const { rows } = await pool.query(
    `SELECT
       oga.id,
       oga.office_id,
       oga.governance_area_id,
       oga.year,
       oga.assigned_at,
       o.code  AS office_code,
       o.name  AS office_name,
       COALESCE(p.pending_review_count, 0)::int AS pending_review_count
     FROM office_governance_assignments oga
     JOIN offices o ON o.id = oga.office_id
     LEFT JOIN (
       SELECT office_id, governance_area_id, COUNT(*)::int AS pending_review_count
       FROM submissions
       WHERE year = $2
         AND status = 'PENDING'
       GROUP BY office_id, governance_area_id
     ) p ON p.office_id = oga.office_id AND p.governance_area_id = oga.governance_area_id
     WHERE oga.governance_area_id = $1 AND oga.year = $2
     ORDER BY o.name`,
    [governanceAreaId, year]
  );
  return rows;
}

/** List all assignments for a year, grouped with full details */
export async function listAllAssignments(year) {
  const { rows } = await pool.query(
    `SELECT
       oga.id,
       oga.year,
       oga.assigned_at,
       oga.office_id,
       o.code  AS office_code,
       o.name  AS office_name,
       oga.governance_area_id,
       ga.code AS governance_code,
       ga.name AS governance_name
     FROM office_governance_assignments oga
     JOIN offices o  ON o.id  = oga.office_id
     JOIN governance_areas ga ON ga.id = oga.governance_area_id
     WHERE oga.year = $1
     ORDER BY o.name, ga.sort_order`,
    [year]
  );
  return rows;
}

/** Assign a governance area to an office for a year (upsert-safe) */
export async function assignGovernanceArea({ officeId, governanceAreaId, year, assignedBy }) {
  const { rows } = await pool.query(
    `INSERT INTO office_governance_assignments (office_id, governance_area_id, year, assigned_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (office_id, governance_area_id, year) DO UPDATE SET
       assigned_at = now(),
       assigned_by = EXCLUDED.assigned_by
     RETURNING *`,
    [officeId, governanceAreaId, year, assignedBy ?? null]
  );
  return rows[0];
}

/** Remove a governance area assignment from an office */
export async function unassignGovernanceArea({ officeId, governanceAreaId, year }) {
  const { rows } = await pool.query(
    `DELETE FROM office_governance_assignments
     WHERE office_id = $1 AND governance_area_id = $2 AND year = $3
     RETURNING id`,
    [officeId, governanceAreaId, year]
  );
  return rows[0] || null;
}

/** Replace ALL assignments for an office+year in one transaction */
export async function setAssignmentsForOffice({ officeId, year, governanceAreaIds, assignedBy }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM office_governance_assignments WHERE office_id = $1 AND year = $2`,
      [officeId, year]
    );

    const inserted = [];
    for (const gaId of governanceAreaIds) {
      const { rows } = await client.query(
        `INSERT INTO office_governance_assignments (office_id, governance_area_id, year, assigned_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [officeId, gaId, year, assignedBy ?? null]
      );
      inserted.push(rows[0]);
    }

    await client.query("COMMIT");
    return inserted;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get assigned checklist items for an office+year
 * (joins assignments → templates → items for the My Checklists page)
 */
export async function getChecklistItemsForOffice(officeId, year) {
  const { rows } = await pool.query(
    `SELECT
       ci.id                   AS item_id,
       ci.parent_item_id       AS parent_item_id,
       ci.item_code,
       ci.title                AS item_title,
       ci.description          AS item_description,
       ci.is_required,
       ci.frequency,
       ci.due_date,
       ci.allowed_file_types,
       ci.max_files,
       ci.sort_order           AS item_sort_order,
       ct.id                   AS template_id,
       ct.title                AS template_title,
       ga.id                   AS governance_area_id,
       ga.code                 AS governance_code,
       ga.name                 AS governance_name,
       ga.sort_order           AS governance_sort_order,
       s.id                    AS submission_id,
       s.status                AS submission_status,
       s.submitted_at,
       s.office_remarks
     FROM office_governance_assignments oga
     JOIN governance_areas ga        ON ga.id  = oga.governance_area_id
     LEFT JOIN checklist_templates ct ON ct.governance_area_id = ga.id AND ct.year = oga.year AND ct.status = 'ACTIVE'
     LEFT JOIN checklist_items ci     ON ci.template_id = ct.id AND ci.is_active = TRUE
     LEFT JOIN submissions s         ON s.checklist_item_id = ci.id AND s.office_id = oga.office_id AND s.year = oga.year
     WHERE oga.office_id = $1 AND oga.year = $2
     ORDER BY ga.sort_order, ga.code, ci.sort_order, ci.item_code`,
    [officeId, year]
  );
  return rows;
}

/** List governance assignment readiness for a specific year */
export async function listGovernanceAssignmentOptions(year) {
  const { rows } = await pool.query(
    `SELECT
       ga.id,
       ga.code,
       ga.name,
       ga.description,
       ga.sort_order,
       ga.is_active,
       COUNT(DISTINCT ct.id)::int AS active_template_count,
       COUNT(DISTINCT ci.id) FILTER (WHERE ci.parent_item_id IS NULL)::int AS root_category_count
     FROM governance_areas ga
     LEFT JOIN checklist_templates ct
       ON ct.governance_area_id = ga.id
      AND ct.year = $1
      AND ct.status = 'ACTIVE'
     LEFT JOIN checklist_items ci
       ON ci.template_id = ct.id
      AND ci.is_active = TRUE
     GROUP BY ga.id, ga.code, ga.name, ga.description, ga.sort_order, ga.is_active
     ORDER BY ga.sort_order, ga.code`,
    [year]
  );
  return rows.map((row) => {
    let unassignableReason = null;
    if (!row.is_active) unassignableReason = "Governance area is inactive";
    else if (row.active_template_count === 0) unassignableReason = `No active template for ${year}`;
    else if (row.root_category_count === 0) unassignableReason = "No active root categories in template";
    return {
      ...row,
      is_assignable: !unassignableReason,
      unassignable_reason: unassignableReason,
    };
  });
}

/** Get readiness details for specific governance IDs in a year */
export async function getGovernanceAssignmentReadinessByIds(year, governanceAreaIds) {
  if (!Array.isArray(governanceAreaIds) || governanceAreaIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT
       ga.id,
       ga.code,
       ga.name,
       ga.is_active,
       COUNT(DISTINCT ct.id)::int AS active_template_count,
       COUNT(DISTINCT ci.id) FILTER (WHERE ci.parent_item_id IS NULL)::int AS root_category_count
     FROM governance_areas ga
     LEFT JOIN checklist_templates ct
       ON ct.governance_area_id = ga.id
      AND ct.year = $1
      AND ct.status = 'ACTIVE'
     LEFT JOIN checklist_items ci
       ON ci.template_id = ct.id
      AND ci.is_active = TRUE
     WHERE ga.id = ANY($2::uuid[])
     GROUP BY ga.id, ga.code, ga.name, ga.is_active`,
    [year, governanceAreaIds]
  );
  return rows.map((row) => {
    let unassignableReason = null;
    if (!row.is_active) unassignableReason = "Governance area is inactive";
    else if (row.active_template_count === 0) unassignableReason = `No active template for ${year}`;
    else if (row.root_category_count === 0) unassignableReason = "No active root categories in template";
    return {
      ...row,
      is_assignable: !unassignableReason,
      unassignable_reason: unassignableReason,
    };
  });
}
