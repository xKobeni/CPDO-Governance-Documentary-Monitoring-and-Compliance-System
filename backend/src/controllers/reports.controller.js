import { pool } from "../config/db.js";

function toFinitePercent(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function parseYear(value) {
  const fallbackYear = new Date().getFullYear();
  if (value === undefined || value === null || value === "") return fallbackYear;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  return year;
}

function buildSubmissionWhere({ year, governanceAreaId, officeId }) {
  const params = [year];
  let where = `WHERE s.year = $1`;

  if (governanceAreaId) {
    params.push(governanceAreaId);
    where += ` AND s.governance_area_id = $${params.length}`;
  }

  if (officeId) {
    params.push(officeId);
    where += ` AND s.office_id = $${params.length}`;
  }

  return { params, where };
}

/**
 * Summary by status for a year (optionally governance area / office)
 */
export async function summaryHandler(req, res) {
  const year = Number(req.query.year);
  if (!year) return res.status(400).json({ message: "year is required" });

  const governanceAreaId = req.query.governanceAreaId || null;
  let officeId = req.query.officeId || null;
  if (req.user.role === "OFFICE") officeId = req.user.officeId;

  const params = [year];
  let where = `WHERE s.year = $1`;

  if (governanceAreaId) { params.push(governanceAreaId); where += ` AND s.governance_area_id = $${params.length}`; }
  if (officeId) { params.push(officeId); where += ` AND s.office_id = $${params.length}`; }

  const { rows } = await pool.query(
    `SELECT s.status, COUNT(*)::int as count
     FROM submissions s
     ${where}
     GROUP BY s.status
     ORDER BY s.status`,
    params
  );

  return res.json({ year, governanceAreaId, officeId, breakdown: rows });
}

/**
 * NO_UPLOAD report: expected items vs missing submissions for an office/year/template
 * Optionally filter governanceAreaId
 */
export async function noUploadHandler(req, res) {
  const year = Number(req.query.year);
  if (!year) return res.status(400).json({ message: "year is required" });

  const governanceAreaId = req.query.governanceAreaId || null;
  let officeId = req.query.officeId || null;
  if (req.user.role === "OFFICE") officeId = req.user.officeId;
  if (!officeId) return res.status(400).json({ message: "officeId is required (unless OFFICE user)" });

  const params = [year, officeId];
  let govFilter = "";
  if (governanceAreaId) {
    params.push(governanceAreaId);
    govFilter = `AND t.governance_area_id = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT
        ga.code as governance_code,
        ga.name as governance_name,
        t.id as template_id,
        ci.id as checklist_item_id,
        ci.item_code,
        ci.title as item_title
     FROM checklist_templates t
     JOIN governance_areas ga ON ga.id = t.governance_area_id
     JOIN checklist_items ci ON ci.template_id = t.id
     LEFT JOIN submissions s
       ON s.year = $1
      AND s.office_id = $2
      AND s.checklist_item_id = ci.id
     WHERE t.year = $1
       AND t.status = 'ACTIVE'
       AND ci.is_active = TRUE
       ${govFilter}
       AND s.id IS NULL
     ORDER BY ga.sort_order, ci.sort_order, ci.item_code`,
    params
  );

  return res.json({ year, officeId, governanceAreaId, missing: rows });
}

/**
 * Dashboard overview (single payload for cards + charts + recent activity)
 */
export async function dashboardOverviewHandler(req, res) {
  const year = parseYear(req.query.year);
  if (!year) return res.status(400).json({ message: "Invalid year" });

  const governanceAreaId = req.query.governanceAreaId || null;
  let officeId = req.query.officeId || null;

  if (req.user.role === "OFFICE") {
    officeId = req.user.officeId;
  }

  const { params, where } = buildSubmissionWhere({ year, governanceAreaId, officeId });

  const statusResult = await pool.query(
    `SELECT s.status, COUNT(*)::int AS count
     FROM submissions s
     ${where}
     GROUP BY s.status
     ORDER BY s.status`,
    params
  );

  const statusMap = {
    PENDING: 0,
    APPROVED: 0,
    DENIED: 0,
    REVISION_REQUESTED: 0,
  };

  for (const row of statusResult.rows) {
    statusMap[row.status] = Number(row.count || 0);
  }

  const totalSubmissions =
    statusMap.PENDING +
    statusMap.APPROVED +
    statusMap.DENIED +
    statusMap.REVISION_REQUESTED;

  const reviewedSubmissions =
    statusMap.APPROVED +
    statusMap.DENIED +
    statusMap.REVISION_REQUESTED;

  const monthlyResult = await pool.query(
    `SELECT EXTRACT(MONTH FROM s.submitted_at)::int AS month, COUNT(*)::int AS count
     FROM submissions s
     ${where}
     GROUP BY EXTRACT(MONTH FROM s.submitted_at)
     ORDER BY month ASC`,
    params
  );

  const topGovernanceResult = await pool.query(
    `SELECT ga.code AS governance_code, ga.name AS governance_name, COUNT(*)::int AS count
     FROM submissions s
     JOIN governance_areas ga ON ga.id = s.governance_area_id
     ${where}
     GROUP BY ga.code, ga.name
     ORDER BY count DESC, ga.code ASC
     LIMIT 5`,
    params
  );

  const recentResult = await pool.query(
    `SELECT
        s.id,
        s.status,
        s.submitted_at,
        o.name AS office_name,
        ga.code AS governance_code,
        ci.item_code,
        ci.title AS item_title
     FROM submissions s
     JOIN offices o ON o.id = s.office_id
     JOIN governance_areas ga ON ga.id = s.governance_area_id
     JOIN checklist_items ci ON ci.id = s.checklist_item_id
     ${where}
     ORDER BY s.submitted_at DESC
     LIMIT 10`,
    params
  );

  let missingUploadsCount = null;
  if (officeId) {
    const noUploadParams = [year, officeId];
    let govFilter = "";
    if (governanceAreaId) {
      noUploadParams.push(governanceAreaId);
      govFilter = `AND t.governance_area_id = $${noUploadParams.length}`;
    }

    const missingResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM checklist_templates t
       JOIN checklist_items ci ON ci.template_id = t.id
       LEFT JOIN submissions s
         ON s.year = $1
        AND s.office_id = $2
        AND s.checklist_item_id = ci.id
       WHERE t.year = $1
         AND t.status = 'ACTIVE'
         AND ci.is_active = TRUE
         ${govFilter}
         AND s.id IS NULL`,
      noUploadParams
    );
    missingUploadsCount = Number(missingResult.rows[0]?.count ?? 0);
  }

  const unreadNotificationsResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM notifications
     WHERE user_id = $1 AND is_read = FALSE`,
    [req.user.sub]
  );

  return res.json({
    year,
    filters: {
      governanceAreaId,
      officeId,
    },
    kpis: {
      totalSubmissions,
      pendingSubmissions: statusMap.PENDING,
      approvedSubmissions: statusMap.APPROVED,
      deniedSubmissions: statusMap.DENIED,
      revisionRequestedSubmissions: statusMap.REVISION_REQUESTED,
      reviewedSubmissions,
      approvalRate: toFinitePercent(statusMap.APPROVED, reviewedSubmissions),
      reviewCompletionRate: toFinitePercent(reviewedSubmissions, totalSubmissions),
      missingUploadsCount,
      unreadNotifications: Number(unreadNotificationsResult.rows[0]?.count ?? 0),
    },
    charts: {
      statusBreakdown: statusResult.rows,
      monthlySubmissionTrend: monthlyResult.rows,
      topGovernanceAreas: topGovernanceResult.rows,
    },
    recentSubmissions: recentResult.rows,
  });
}