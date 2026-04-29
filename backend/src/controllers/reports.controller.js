import { pool } from "../config/db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

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

const MILESTONE_KEYS = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  UNDER_REVIEW: "UNDER_REVIEW",
  COMPLIANT: "COMPLIANT",
};

function mapSubmissionStatusToMilestone(status) {
  if (status === "APPROVED") return MILESTONE_KEYS.COMPLIANT;
  if (status === "REVISION_REQUESTED") return MILESTONE_KEYS.UNDER_REVIEW;
  if (status === "PENDING") return MILESTONE_KEYS.IN_PROGRESS;
  return null;
}

function parseOfficeScopedParams(req) {
  const year = parseYear(req.query.year);
  if (!year) return { error: "Invalid year" };

  const governanceAreaId = req.query.governanceAreaId || null;
  let officeId = req.query.officeId || null;
  if (req.user.role === "OFFICE") officeId = req.user.officeId;

  return { year, governanceAreaId, officeId };
}

function buildMonthScaffold(year) {
  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    return {
      year,
      month,
      label: new Date(year, idx, 1).toLocaleString("en-PH", { month: "short" }),
      totalExpected: 0,
      compliant: 0,
      underReview: 0,
      inProgress: 0,
      notStarted: 0,
      reviewed: 0,
      completionPercentage: 0,
    };
  });
}

async function buildComplianceProgressDataset({ year, governanceAreaId, officeId }) {
  const expectedParams = [year];
  let expectedFilter = "";
  if (governanceAreaId) {
    expectedParams.push(governanceAreaId);
    expectedFilter += ` AND t.governance_area_id = $${expectedParams.length}`;
  }

  const expectedResult = await pool.query(
    `SELECT
       ci.id AS checklist_item_id,
       ci.due_date,
       EXTRACT(MONTH FROM COALESCE(ci.due_date, make_date($1, 12, 31)))::int AS month
     FROM checklist_templates t
     JOIN checklist_items ci ON ci.template_id = t.id
     WHERE t.year = $1
       AND t.status = 'ACTIVE'
       AND ci.is_active = TRUE
       ${expectedFilter}`,
    expectedParams
  );

  const expectedItems = expectedResult.rows;
  const expectedByItem = new Map(expectedItems.map((row) => [row.checklist_item_id, row]));

  const submissionParams = [year];
  let submissionWhere = `WHERE s.year = $1`;
  if (governanceAreaId) {
    submissionParams.push(governanceAreaId);
    submissionWhere += ` AND s.governance_area_id = $${submissionParams.length}`;
  }
  if (officeId) {
    submissionParams.push(officeId);
    submissionWhere += ` AND s.office_id = $${submissionParams.length}`;
  }

  const submissionResult = await pool.query(
    `SELECT
       s.checklist_item_id,
       s.status,
       s.submitted_at,
       ROW_NUMBER() OVER (
         PARTITION BY s.checklist_item_id
         ORDER BY s.updated_at DESC NULLS LAST, s.submitted_at DESC NULLS LAST
       ) AS row_num
     FROM submissions s
     ${submissionWhere}`,
    submissionParams
  );

  const latestSubmissionByItem = new Map();
  for (const row of submissionResult.rows) {
    if (row.row_num === 1) {
      latestSubmissionByItem.set(row.checklist_item_id, row);
    }
  }

  const monthRows = buildMonthScaffold(year);
  const milestones = {
    [MILESTONE_KEYS.NOT_STARTED]: 0,
    [MILESTONE_KEYS.IN_PROGRESS]: 0,
    [MILESTONE_KEYS.UNDER_REVIEW]: 0,
    [MILESTONE_KEYS.COMPLIANT]: 0,
  };

  let deniedCount = 0;
  let reviewedCount = 0;
  let overdueBlocked = 0;
  const now = new Date();

  for (const expected of expectedItems) {
    const monthIndex = Math.max(1, Math.min(12, Number(expected.month || 12))) - 1;
    const monthRow = monthRows[monthIndex];
    monthRow.totalExpected += 1;

    const latestSubmission = latestSubmissionByItem.get(expected.checklist_item_id);
    if (!latestSubmission) {
      milestones[MILESTONE_KEYS.NOT_STARTED] += 1;
      monthRow.notStarted += 1;
      if (expected.due_date && new Date(expected.due_date) < now) {
        overdueBlocked += 1;
      }
      continue;
    }

    const mappedMilestone = mapSubmissionStatusToMilestone(latestSubmission.status);
    if (latestSubmission.status === "DENIED") {
      deniedCount += 1;
      reviewedCount += 1;
      monthRow.reviewed += 1;
      if (expected.due_date && new Date(expected.due_date) < now) {
        overdueBlocked += 1;
      }
      continue;
    }

    if (!mappedMilestone) {
      milestones[MILESTONE_KEYS.NOT_STARTED] += 1;
      monthRow.notStarted += 1;
      continue;
    }

    milestones[mappedMilestone] += 1;
    if (mappedMilestone === MILESTONE_KEYS.COMPLIANT) monthRow.compliant += 1;
    if (mappedMilestone === MILESTONE_KEYS.UNDER_REVIEW) monthRow.underReview += 1;
    if (mappedMilestone === MILESTONE_KEYS.IN_PROGRESS) monthRow.inProgress += 1;

    if (mappedMilestone === MILESTONE_KEYS.COMPLIANT || mappedMilestone === MILESTONE_KEYS.UNDER_REVIEW) {
      reviewedCount += 1;
      monthRow.reviewed += 1;
    }

    const isOverdueStatus =
      mappedMilestone === MILESTONE_KEYS.IN_PROGRESS || mappedMilestone === MILESTONE_KEYS.UNDER_REVIEW;
    if (isOverdueStatus && expected.due_date && new Date(expected.due_date) < now) {
      overdueBlocked += 1;
    }
  }

  for (const row of monthRows) {
    row.completionPercentage = toFinitePercent(row.reviewed, row.totalExpected);
  }

  const totalExpected = expectedItems.length;
  const completionPercentage = toFinitePercent(reviewedCount, totalExpected);

  return {
    snapshot: {
      totalExpected,
      reviewed: reviewedCount,
      completionPercentage,
      overdueBlocked,
      milestones,
      details: {
        denied: deniedCount,
      },
    },
    monthlyTrend: monthRows,
  };
}

function safeSlug(value) {
  return String(value || "all-offices")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();
}

function applyDownloadHeaders(res, { format, fileStem }) {
  const extension = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
  const mimeType =
    extension === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : extension === "pdf"
        ? "application/pdf"
        : "text/csv; charset=utf-8";
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileStem}.${extension}\"`);
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

/**
 * Contract:
 * {
 *   year: number,
 *   filters: { officeId: string|null, governanceAreaId: string|null },
 *   snapshot: {
 *     totalExpected: number,
 *     reviewed: number,
 *     completionPercentage: number, // reviewed / totalExpected
 *     overdueBlocked: number,
 *     milestones: { NOT_STARTED: number, IN_PROGRESS: number, UNDER_REVIEW: number, COMPLIANT: number },
 *     details: { denied: number }
 *   },
 *   monthlyTrend: Array<{
 *     year: number,
 *     month: number,
 *     label: string,
 *     totalExpected: number,
 *     compliant: number,
 *     underReview: number,
 *     inProgress: number,
 *     notStarted: number,
 *     reviewed: number,
 *     completionPercentage: number
 *   }>,
 *   meta: { generatedAt: string }
 * }
 */
export async function complianceProgressHandler(req, res) {
  const parsed = parseOfficeScopedParams(req);
  if (parsed.error) return res.status(400).json({ message: parsed.error });

  const { year, officeId, governanceAreaId } = parsed;
  const data = await buildComplianceProgressDataset({ year, officeId, governanceAreaId });

  return res.json({
    year,
    filters: { officeId, governanceAreaId },
    snapshot: data.snapshot,
    monthlyTrend: data.monthlyTrend,
    meta: { generatedAt: new Date().toISOString() },
  });
}

export async function complianceProgressExportHandler(req, res) {
  const parsed = parseOfficeScopedParams(req);
  if (parsed.error) return res.status(400).json({ message: parsed.error });

  const format = String(req.query.format || "csv").toLowerCase();
  if (!["csv", "xlsx", "pdf"].includes(format)) {
    return res.status(400).json({ message: "Invalid format. Use csv, xlsx, or pdf." });
  }

  const { year, officeId, governanceAreaId } = parsed;
  const data = await buildComplianceProgressDataset({ year, officeId, governanceAreaId });
  const fileStem = `compliance-progress-${safeSlug(officeId || "all-offices")}-${year}`;
  applyDownloadHeaders(res, { format, fileStem });

  if (format === "csv") {
    const csvLines = [
      "Section,Metric,Value",
      `Snapshot,Total Expected,${data.snapshot.totalExpected}`,
      `Snapshot,Reviewed,${data.snapshot.reviewed}`,
      `Snapshot,Completion Percentage,${data.snapshot.completionPercentage}%`,
      `Snapshot,Overdue Blocked,${data.snapshot.overdueBlocked}`,
      `Milestones,Not Started,${data.snapshot.milestones.NOT_STARTED}`,
      `Milestones,In Progress,${data.snapshot.milestones.IN_PROGRESS}`,
      `Milestones,Under Review,${data.snapshot.milestones.UNDER_REVIEW}`,
      `Milestones,Compliant,${data.snapshot.milestones.COMPLIANT}`,
      `Details,Denied,${data.snapshot.details.denied}`,
      "",
      "Monthly Trend",
      "Month,Total Expected,Reviewed,Completion Percentage,Compliant,Under Review,In Progress,Not Started",
      ...data.monthlyTrend.map(
        (m) =>
          `${m.label},${m.totalExpected},${m.reviewed},${m.completionPercentage}%,${m.compliant},${m.underReview},${m.inProgress},${m.notStarted}`
      ),
    ];
    return res.send(csvLines.join("\n"));
  }

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const summarySheet = workbook.addWorksheet("Executive Summary");
    summarySheet.addRows([
      ["Compliance Progress Report"],
      ["Year", year],
      ["Office", officeId || "All Offices"],
      ["Generated At", new Date().toLocaleString("en-PH")],
      [],
      ["Metric", "Value"],
      ["Total Expected", data.snapshot.totalExpected],
      ["Reviewed", data.snapshot.reviewed],
      ["Completion Percentage", `${data.snapshot.completionPercentage}%`],
      ["Overdue Blocked", data.snapshot.overdueBlocked],
      ["Not Started", data.snapshot.milestones.NOT_STARTED],
      ["In Progress", data.snapshot.milestones.IN_PROGRESS],
      ["Under Review", data.snapshot.milestones.UNDER_REVIEW],
      ["Compliant", data.snapshot.milestones.COMPLIANT],
      ["Denied", data.snapshot.details.denied],
    ]);
    summarySheet.columns = [{ width: 28 }, { width: 30 }];

    const trendSheet = workbook.addWorksheet("Monthly Trend");
    trendSheet.addRow([
      "Month",
      "Total Expected",
      "Reviewed",
      "Completion %",
      "Compliant",
      "Under Review",
      "In Progress",
      "Not Started",
    ]);
    for (const row of data.monthlyTrend) {
      trendSheet.addRow([
        row.label,
        row.totalExpected,
        row.reviewed,
        `${row.completionPercentage}%`,
        row.compliant,
        row.underReview,
        row.inProgress,
        row.notStarted,
      ]);
    }
    trendSheet.columns = [
      { width: 14 },
      { width: 16 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
    ];

    await workbook.xlsx.write(res);
    return res.end();
  }

  const doc = new PDFDocument({ margin: 48, size: "A4" });
  doc.pipe(res);
  doc.fontSize(18).text("Compliance Progress Report", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Year: ${year}`);
  doc.text(`Office: ${officeId || "All Offices"}`);
  doc.text(`Generated: ${new Date().toLocaleString("en-PH")}`);
  doc.moveDown(1);

  doc.fontSize(13).text("Executive Summary");
  doc.moveDown(0.4);
  const executiveLines = [
    `Total Expected Items: ${data.snapshot.totalExpected}`,
    `Reviewed Items: ${data.snapshot.reviewed}`,
    `Completion Percentage: ${data.snapshot.completionPercentage}%`,
    `Overdue/Blocked Items: ${data.snapshot.overdueBlocked}`,
    `Not Started: ${data.snapshot.milestones.NOT_STARTED}`,
    `In Progress: ${data.snapshot.milestones.IN_PROGRESS}`,
    `Under Review: ${data.snapshot.milestones.UNDER_REVIEW}`,
    `Compliant: ${data.snapshot.milestones.COMPLIANT}`,
    `Denied: ${data.snapshot.details.denied}`,
  ];
  doc.fontSize(11);
  executiveLines.forEach((line) => doc.text(`- ${line}`));

  doc.moveDown(1);
  doc.fontSize(13).text("Monthly Trend");
  doc.moveDown(0.4);
  doc.fontSize(10);
  data.monthlyTrend.forEach((row) => {
    doc.text(
      `${row.label}: ${row.completionPercentage}% (${row.reviewed}/${row.totalExpected}) | C:${row.compliant} UR:${row.underReview} IP:${row.inProgress} NS:${row.notStarted}`
    );
  });
  doc.end();
}