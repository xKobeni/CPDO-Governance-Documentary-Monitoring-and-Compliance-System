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
    `WITH assignment_pairs AS (
      SELECT DISTINCT
        oga.office_id,
        oga.governance_area_id,
        ga.code AS governance_code,
        ga.name AS governance_name
      FROM office_governance_assignments oga
      JOIN governance_areas ga
        ON ga.id = oga.governance_area_id
      JOIN offices o
        ON o.id = oga.office_id
       AND o.is_active = TRUE
      WHERE oga.year = $1
    ),
    assigned_offices AS (
      SELECT DISTINCT
        ap.office_id,
        o.code AS office_code,
        o.name AS office_name
      FROM assignment_pairs ap
      JOIN offices o
        ON o.id = ap.office_id
    ),
    assigned_area_categories AS (
      SELECT DISTINCT
        ap.office_id,
        ap.governance_area_id,
        ap.governance_code,
        ap.governance_name,
        ga.sort_order AS governance_sort_order,
        ct.id AS template_id,
        ci.id AS category_id,
        ci.item_code AS category_code,
        ci.title AS category_name,
        ci.sort_order AS category_sort_order
      FROM assignment_pairs ap
      JOIN governance_areas ga
        ON ga.id = ap.governance_area_id
      JOIN checklist_templates ct
        ON ct.governance_area_id = ap.governance_area_id
       AND ct.year = $1
       AND ct.status = 'ACTIVE'
      JOIN checklist_items ci
        ON ci.template_id = ct.id
       AND ci.is_active = TRUE
       AND ci.parent_item_id IS NULL
    ),
    category_items AS (
      SELECT
        c.office_id,
        c.governance_area_id,
        c.governance_code,
        c.governance_name,
        c.governance_sort_order,
        c.template_id,
        c.category_id,
        c.category_code,
        c.category_name,
        c.category_sort_order,
        i.id AS checklist_item_id,
        i.item_code,
        i.title AS item_title,
        i.is_required
      FROM assigned_area_categories c
      JOIN checklist_items i
        ON i.template_id = c.template_id
       AND i.is_active = TRUE
       AND (
         i.id = c.category_id
         OR i.parent_item_id = c.category_id
         OR i.parent_item_id IN (
           SELECT ci_child.id
           FROM checklist_items ci_child
           WHERE ci_child.parent_item_id = c.category_id
         )
       )
    )
    SELECT
      ao.office_id,
      ao.office_code,
      ao.office_name,
      ci.governance_area_id,
      ci.governance_code,
      ci.governance_name,
      ci.governance_sort_order,
      ci.category_id,
      ci.category_code,
      ci.category_name,
      ci.category_sort_order,
      ci.checklist_item_id,
      ci.item_code,
      ci.item_title,
      ci.is_required,
      s.id AS submission_id,
      s.status AS submission_status,
      s.submitted_at,
      s.office_remarks,
      lr.decision_notes AS reviewer_remarks
    FROM assigned_offices ao
    LEFT JOIN category_items ci
      ON ci.office_id = ao.office_id
    LEFT JOIN submissions s
      ON s.year = $1
     AND s.office_id = ao.office_id
     AND s.checklist_item_id = ci.checklist_item_id
    LEFT JOIN LATERAL (
      SELECT r.decision_notes
      FROM reviews r
      WHERE r.submission_id = s.id
      ORDER BY r.reviewed_at DESC
      LIMIT 1
    ) lr ON TRUE
    ORDER BY
      ci.governance_sort_order NULLS LAST,
      ci.governance_code NULLS LAST,
      ci.category_sort_order NULLS LAST,
      ci.category_code NULLS LAST,
      ao.office_name,
      ci.item_code NULLS LAST`,
    [year]
  );

  const { rows: unconfiguredRows } = await pool.query(
    `WITH assignment_pairs AS (
      SELECT DISTINCT
        oga.office_id,
        oga.governance_area_id
      FROM office_governance_assignments oga
      JOIN offices o
        ON o.id = oga.office_id
       AND o.is_active = TRUE
      WHERE oga.year = $1
    ),
    configured_pairs AS (
      SELECT DISTINCT
        ap.office_id,
        ap.governance_area_id
      FROM assignment_pairs ap
      JOIN checklist_templates ct
        ON ct.governance_area_id = ap.governance_area_id
       AND ct.year = $1
       AND ct.status = 'ACTIVE'
      JOIN checklist_items ci
        ON ci.template_id = ct.id
       AND ci.is_active = TRUE
       AND ci.parent_item_id IS NULL
    )
    SELECT
      ap.office_id,
      o.code AS office_code,
      o.name AS office_name,
      ap.governance_area_id,
      ga.code AS governance_code,
      ga.name AS governance_name
    FROM assignment_pairs ap
    LEFT JOIN configured_pairs cp
      ON cp.office_id = ap.office_id
     AND cp.governance_area_id = ap.governance_area_id
    JOIN offices o
      ON o.id = ap.office_id
    JOIN governance_areas ga
      ON ga.id = ap.governance_area_id
    WHERE cp.office_id IS NULL
    ORDER BY ga.code, o.name`,
    [year]
  );

  const officesMap = new Map();
  const categoriesMap = new Map();
  const cellsMap = new Map();
  const detailsMap = new Map();

  for (const row of rows) {
    if (!officesMap.has(row.office_id)) {
      officesMap.set(row.office_id, {
        id: row.office_id,
        code: row.office_code,
        name: row.office_name,
      });
    }

    if (!row.category_id) continue;

    if (!categoriesMap.has(row.category_id)) {
      categoriesMap.set(row.category_id, {
        id: row.category_id,
        governanceAreaId: row.governance_area_id,
        governanceCode: row.governance_code,
        governanceName: row.governance_name,
        categoryCode: row.category_code,
        categoryName: row.category_name,
        sortOrder: {
          governance: row.governance_sort_order ?? 0,
          category: row.category_sort_order ?? 0,
        },
      });
    }

    const cellKey = `${row.office_id}:${row.category_id}`;
    if (!cellsMap.has(cellKey)) {
      cellsMap.set(cellKey, {
        officeId: row.office_id,
        categoryId: row.category_id,
        status: "NOT_SUBMITTED",
        counts: {
          totalItems: 0,
          submitted: 0,
          pending: 0,
          revisionRequested: 0,
          approved: 0,
          requiredItems: 0,
          requiredApproved: 0,
        },
        hasAnySubmission: false,
      });
      detailsMap.set(cellKey, {
        officeId: row.office_id,
        categoryId: row.category_id,
        items: [],
      });
    }

    if (!row.checklist_item_id) continue;

    const cell = cellsMap.get(cellKey);
    const detail = detailsMap.get(cellKey);
    cell.counts.totalItems += 1;

    if (row.is_required) {
      cell.counts.requiredItems += 1;
    }

    if (row.submission_id) {
      cell.hasAnySubmission = true;
      cell.counts.submitted += 1;
      if (row.submission_status === "PENDING") cell.counts.pending += 1;
      if (row.submission_status === "REVISION_REQUESTED") cell.counts.revisionRequested += 1;
      if (row.submission_status === "APPROVED") {
        cell.counts.approved += 1;
        if (row.is_required) cell.counts.requiredApproved += 1;
      }
    }

    detail.items.push({
      checklistItemId: row.checklist_item_id,
      itemCode: row.item_code,
      itemTitle: row.item_title,
      latestSubmissionStatus: row.submission_status ?? "NOT_SUBMITTED",
      submittedAt: row.submitted_at ?? null,
      reviewerRemarks: row.reviewer_remarks ?? null,
      officeRemarks: row.office_remarks ?? null,
    });
  }

  const categories = Array.from(categoriesMap.values())
    .sort((a, b) => {
      if (a.sortOrder.governance !== b.sortOrder.governance) return a.sortOrder.governance - b.sortOrder.governance;
      if (a.governanceCode !== b.governanceCode) return a.governanceCode.localeCompare(b.governanceCode);
      if (a.sortOrder.category !== b.sortOrder.category) return a.sortOrder.category - b.sortOrder.category;
      return a.categoryCode.localeCompare(b.categoryCode);
    })
    .map(({ sortOrder, ...rest }) => rest);

  const offices = Array.from(officesMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name) || a.code.localeCompare(b.code)
  );

  const cells = Array.from(cellsMap.values()).map((cell) => {
    const { requiredItems, requiredApproved } = cell.counts;
    let status = "NOT_SUBMITTED";
    if (cell.counts.revisionRequested > 0) status = "REVISION_REQUESTED";
    else if (cell.counts.pending > 0) status = "PENDING";
    else if (requiredItems > 0 && requiredApproved >= requiredItems) status = "APPROVED";
    else if (cell.hasAnySubmission) status = "PENDING";

    return {
      officeId: cell.officeId,
      categoryId: cell.categoryId,
      status,
      counts: {
        totalItems: cell.counts.totalItems,
        submitted: cell.counts.submitted,
        pending: cell.counts.pending,
        revisionRequested: cell.counts.revisionRequested,
        approved: cell.counts.approved,
      },
      hasAnySubmission: cell.hasAnySubmission,
    };
  });

  const detailsByCell = Array.from(detailsMap.values()).map((entry) => ({
    ...entry,
    items: entry.items.sort((a, b) => a.itemCode.localeCompare(b.itemCode, undefined, { numeric: true })),
  }));

  const unconfiguredAssignments = unconfiguredRows.map((row) => ({
    officeId: row.office_id,
    officeCode: row.office_code,
    officeName: row.office_name,
    governanceAreaId: row.governance_area_id,
    governanceCode: row.governance_code,
    governanceName: row.governance_name,
  }));

  return { year, offices, categories, cells, detailsByCell, unconfiguredAssignments };
}
