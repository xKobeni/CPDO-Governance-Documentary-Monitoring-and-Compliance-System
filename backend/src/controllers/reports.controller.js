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

function drawSectionTitle(doc, title) {
  doc
    .moveDown(0.8)
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#0f172a")
    .text(title);
  doc
    .moveDown(0.15)
    .strokeColor("#cbd5e1")
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.35);
}

function drawMetricTable(doc, rows) {
  const left = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const labelWidth = Math.floor(usableWidth * 0.66);
  const valueWidth = usableWidth - labelWidth;
  const rowHeight = 20;

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a");
  doc.rect(left, doc.y, usableWidth, rowHeight).fill("#e2e8f0");
  doc
    .fillColor("#0f172a")
    .text("Metric", left + 8, doc.y + 6, { width: labelWidth - 12 })
    .text("Value", left + labelWidth + 8, doc.y + 6, { width: valueWidth - 12 });
  doc.y += rowHeight;

  doc.font("Helvetica").fontSize(10);
  rows.forEach((row, idx) => {
    const y = doc.y;
    doc.rect(left, y, usableWidth, rowHeight).fill(idx % 2 === 0 ? "#ffffff" : "#f8fafc");
    doc
      .fillColor("#0f172a")
      .text(row.metric, left + 8, y + 6, { width: labelWidth - 12 })
      .text(String(row.value), left + labelWidth + 8, y + 6, { width: valueWidth - 12, align: "right" });
    doc.y += rowHeight;
  });
}

function drawMonthlyTrendTable(doc, monthlyTrend) {
  const left = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const rowHeight = 18;
  const columns = [
    { key: "label", label: "Month", width: 70, align: "left" },
    { key: "totalExpected", label: "Expected", width: 70, align: "right" },
    { key: "reviewed", label: "Reviewed", width: 70, align: "right" },
    { key: "completionPercentage", label: "Completion %", width: 85, align: "right" },
    { key: "compliant", label: "Compliant", width: 70, align: "right" },
    { key: "underReview", label: "Under Review", width: 78, align: "right" },
    { key: "inProgress", label: "In Progress", width: 70, align: "right" },
    { key: "notStarted", label: "Not Started", width: 70, align: "right" },
  ];

  const headerWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const tableWidth = Math.min(headerWidth, usableWidth);
  const scale = tableWidth / headerWidth;
  columns.forEach((col) => {
    col.width = Math.floor(col.width * scale);
  });

  const drawHeader = () => {
    doc.rect(left, doc.y, tableWidth, rowHeight).fill("#e2e8f0");
    let x = left;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a");
    columns.forEach((col) => {
      doc.text(col.label, x + 4, doc.y + 5, {
        width: col.width - 8,
        align: col.align === "left" ? "left" : "right",
      });
      x += col.width;
    });
    doc.y += rowHeight;
  };

  drawHeader();
  doc.font("Helvetica").fontSize(8.5);
  monthlyTrend.forEach((row, idx) => {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 28) {
      doc.addPage();
      drawHeader();
    }

    const y = doc.y;
    doc.rect(left, y, tableWidth, rowHeight).fill(idx % 2 === 0 ? "#ffffff" : "#f8fafc");
    let x = left;
    columns.forEach((col) => {
      const value =
        col.key === "completionPercentage" ? `${Number(row[col.key] || 0).toFixed(2)}%` : String(row[col.key] ?? 0);
      doc.fillColor("#0f172a").text(value, x + 4, y + 5, {
        width: col.width - 8,
        align: col.align,
      });
      x += col.width;
    });
    doc.y += rowHeight;
  });
}

function drawReportHeader(doc, { reportTitle, subtitle, year, coverage, generatedAt }) {
  doc
    .rect(doc.page.margins.left, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 56)
    .fill("#0f172a");
  const bannerTop = doc.y;
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Republic of the Philippines", doc.page.margins.left + 14, bannerTop + 8, { align: "left" })
    .fontSize(10)
    .font("Helvetica")
    .text("City Planning and Development Office", doc.page.margins.left + 14, bannerTop + 23, { align: "left" })
    .text("CPDO Monitoring System", doc.page.margins.left + 14, bannerTop + 36, { align: "left" });
  doc.moveDown(2.6);

  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(15).text(reportTitle, { align: "center" });
  if (subtitle) {
    doc.moveDown(0.2).font("Helvetica").fontSize(10).fillColor("#334155").text(subtitle, { align: "center" });
  }
  doc.moveDown(0.6);

  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const boxHeight = 58;
  const top = doc.y;
  doc.roundedRect(left, top, width, boxHeight, 3).fill("#f8fafc");
  doc.strokeColor("#cbd5e1").lineWidth(1).roundedRect(left, top, width, boxHeight, 3).stroke();
  doc
    .fillColor("#0f172a")
    .font("Helvetica")
    .fontSize(9.5)
    .text(`Reporting Year: ${year}`, left + 10, top + 10)
    .text(`Coverage: ${coverage}`, left + 10, top + 25)
    .text(`Generated On: ${generatedAt}`, left + 10, top + 40)
    .text("Prepared By: CPDO Monitoring System", left + width / 2, top + 10);
  doc.y = top + boxHeight + 4;
}

function finalizePdfWithFooter(doc, generatedAt) {
  // Footer intentionally disabled per UI/reporting request.
  // Keep function for compatibility with existing export handlers.
  void doc;
  void generatedAt;
}

async function fetchMissingUploads({ year, officeId, governanceAreaId }) {
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

  return rows;
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

  const rows = await fetchMissingUploads({ year, officeId, governanceAreaId });

  return res.json({ year, officeId, governanceAreaId, missing: rows });
}

export async function noUploadExportHandler(req, res) {
  const year = Number(req.query.year);
  if (!year) return res.status(400).json({ message: "year is required" });

  const format = String(req.query.format || "csv").toLowerCase();
  if (!["csv", "pdf"].includes(format)) {
    return res.status(400).json({ message: "Invalid format. Use csv or pdf." });
  }

  const governanceAreaId = req.query.governanceAreaId || null;
  let officeId = req.query.officeId || null;
  if (req.user.role === "OFFICE") officeId = req.user.officeId;
  if (!officeId) return res.status(400).json({ message: "officeId is required (unless OFFICE user)" });

  const rows = await fetchMissingUploads({ year, officeId, governanceAreaId });
  const fileStem = `missing-uploads-${safeSlug(officeId)}-${year}`;

  if (format === "pdf" && rows.length === 0) {
    return res.status(422).json({
      message: "No missing uploads found for the selected filters. PDF was not generated.",
    });
  }

  applyDownloadHeaders(res, { format, fileStem });

  if (format === "csv") {
    const csvLines = [
      "Governance Area,Governance Code,Item Code,Item Title",
      ...rows.map((r) =>
        `"${r.governance_name}","${r.governance_code}","${r.item_code || ""}","${(r.item_title || "").replace(/"/g, '""')}"`
      ),
    ];
    return res.send(csvLines.join("\n"));
  }

  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.governance_code]) {
      acc[row.governance_code] = { name: row.governance_name, items: [] };
    }
    acc[row.governance_code].items.push(row);
    return acc;
  }, {});

  const doc = new PDFDocument({ margin: 42, size: "A4", bufferPages: true });
  doc.pipe(res);

  const generatedAt = new Date().toLocaleString("en-PH");
  drawReportHeader(doc, {
    reportTitle: "MISSING UPLOADS REPORT",
    subtitle: "Checklist items without submission",
    year,
    coverage: `Office #${officeId}`,
    generatedAt,
  });
  doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(`Total Missing Items: ${rows.length}`);

  drawSectionTitle(doc, "I. Missing Items by Governance Area");
  if (!rows.length) {
    doc.font("Helvetica").fontSize(10).text("No missing uploads found for the selected filters.");
    finalizePdfWithFooter(doc, generatedAt);
    doc.end();
    return;
  }

  const left = doc.page.margins.left;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const rowHeight = 18;
  const codeWidth = 72;
  const titleWidth = totalWidth - codeWidth - 12;

  Object.entries(grouped).forEach(([code, group]) => {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 80) doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#0f172a")
      .text(`${code} - ${group.name} (${group.items.length} missing)`);
    doc.moveDown(0.2);

    doc.rect(left, doc.y, totalWidth, rowHeight).fill("#e2e8f0");
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#0f172a")
      .text("Item Code", left + 6, doc.y + 5, { width: codeWidth - 8 })
      .text("Checklist Item", left + codeWidth, doc.y + 5, { width: titleWidth, align: "left" });
    doc.y += rowHeight;

    group.items.forEach((item, idx) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 26) doc.addPage();
      const y = doc.y;
      doc.rect(left, y, totalWidth, rowHeight).fill(idx % 2 === 0 ? "#ffffff" : "#f8fafc");
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#0f172a")
        .text(item.item_code || "-", left + 6, y + 5, { width: codeWidth - 8 })
        .text(item.item_title || "Untitled item", left + codeWidth, y + 5, { width: titleWidth, align: "left" });
      doc.y += rowHeight;
    });
    doc.moveDown(0.5);
  });

  // Avoid forcing a trailing page when very close to bottom.
  const bottomSafeY = doc.page.height - doc.page.margins.bottom - 16;
  if (doc.y <= bottomSafeY) {
    doc
      .font("Helvetica-Oblique")
      .fontSize(8.5)
      .fillColor("#475569")
      .text("This is a system-generated report intended for monitoring and compliance follow-up.");
  }
  finalizePdfWithFooter(doc, generatedAt);
  doc.end();
}

async function buildDashboardOverviewDataset({ year, governanceAreaId, officeId, userId }) {
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
    [userId]
  );

  return {
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
  };
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

  const payload = await buildDashboardOverviewDataset({
    year,
    governanceAreaId,
    officeId,
    userId: req.user.sub,
  });

  return res.json(payload);
}

export async function dashboardOverviewExportHandler(req, res) {
  const year = parseYear(req.query.year);
  if (!year) return res.status(400).json({ message: "Invalid year" });

  const format = String(req.query.format || "pdf").toLowerCase();
  if (!["csv", "pdf"].includes(format)) {
    return res.status(400).json({ message: "Invalid format. Use csv or pdf." });
  }

  const governanceAreaId = req.query.governanceAreaId || null;
  let officeId = req.query.officeId || null;
  if (req.user.role === "OFFICE") officeId = req.user.officeId;

  const data = await buildDashboardOverviewDataset({
    year,
    governanceAreaId,
    officeId,
    userId: req.user.sub,
  });

  const fileStem = `dashboard-overview-${safeSlug(officeId || "all-offices")}-${year}`;
  const hasDashboardData =
    data.kpis.totalSubmissions > 0 ||
    data.recentSubmissions.length > 0 ||
    (data.charts?.topGovernanceAreas?.length || 0) > 0;

  if (format === "pdf" && !hasDashboardData) {
    return res.status(422).json({
      message: "No dashboard data found for the selected filters. PDF was not generated.",
    });
  }

  applyDownloadHeaders(res, { format, fileStem });

  if (format === "csv") {
    const csvLines = [
      "Section,Metric,Value",
      `KPI,Total Submissions,${data.kpis.totalSubmissions}`,
      `KPI,Pending,${data.kpis.pendingSubmissions}`,
      `KPI,Approved,${data.kpis.approvedSubmissions}`,
      `KPI,Denied,${data.kpis.deniedSubmissions}`,
      `KPI,Needs Revision,${data.kpis.revisionRequestedSubmissions}`,
      `KPI,Reviewed,${data.kpis.reviewedSubmissions}`,
      `KPI,Approval Rate,${data.kpis.approvalRate}%`,
      `KPI,Review Completion Rate,${data.kpis.reviewCompletionRate}%`,
      `KPI,Unread Notifications,${data.kpis.unreadNotifications}`,
      "",
      "Recent Submissions",
      "Office,Area,Item Code,Item Title,Status,Submitted At",
      ...data.recentSubmissions.map(
        (r) =>
          `"${r.office_name}","${r.governance_code}","${r.item_code || ""}","${(r.item_title || "").replace(/"/g, '""')}","${r.status}","${new Date(r.submitted_at).toLocaleString("en-PH")}"`
      ),
    ];
    return res.send(csvLines.join("\n"));
  }

  const doc = new PDFDocument({ margin: 42, size: "A4", bufferPages: true });
  doc.pipe(res);
  const generatedAt = new Date().toLocaleString("en-PH");

  drawReportHeader(doc, {
    reportTitle: "DASHBOARD EXECUTIVE REPORT",
    subtitle: "KPI summary, status distribution, and recent submissions",
    year,
    coverage: officeId ? `Office #${officeId}` : "All Offices",
    generatedAt,
  });

  drawSectionTitle(doc, "I. Key Performance Indicators");
  drawMetricTable(doc, [
    { metric: "Total Submissions", value: data.kpis.totalSubmissions },
    { metric: "Pending", value: data.kpis.pendingSubmissions },
    { metric: "Approved", value: data.kpis.approvedSubmissions },
    { metric: "Denied", value: data.kpis.deniedSubmissions },
    { metric: "Needs Revision", value: data.kpis.revisionRequestedSubmissions },
    { metric: "Reviewed", value: data.kpis.reviewedSubmissions },
    { metric: "Approval Rate", value: `${Number(data.kpis.approvalRate || 0).toFixed(2)}%` },
    { metric: "Review Completion Rate", value: `${Number(data.kpis.reviewCompletionRate || 0).toFixed(2)}%` },
    { metric: "Unread Notifications", value: data.kpis.unreadNotifications },
  ]);

  drawSectionTitle(doc, "II. Recent Submissions");
  if (!data.recentSubmissions.length) {
    doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text("No recent submissions available for selected filters.");
  } else {
    const left = doc.page.margins.left;
    const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const rowHeight = 18;
    const columns = [
      { label: "Office", width: 122 },
      { label: "Area", width: 40 },
      { label: "Item", width: 170 },
      { label: "Status", width: 70 },
      { label: "Submitted", width: 100 },
    ];
    const scale = totalWidth / columns.reduce((sum, c) => sum + c.width, 0);
    columns.forEach((c) => {
      c.width = Math.floor(c.width * scale);
    });

    doc.rect(left, doc.y, totalWidth, rowHeight).fill("#e2e8f0");
    let x = left;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a");
    columns.forEach((c) => {
      doc.text(c.label, x + 4, doc.y + 5, { width: c.width - 8 });
      x += c.width;
    });
    doc.y += rowHeight;

    data.recentSubmissions.forEach((item, idx) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 26) {
        doc.addPage();
      }
      const y = doc.y;
      doc.rect(left, y, totalWidth, rowHeight).fill(idx % 2 === 0 ? "#ffffff" : "#f8fafc");
      x = left;
      const values = [
        item.office_name,
        item.governance_code,
        `${item.item_code || "-"} ${item.item_title || ""}`.trim(),
        item.status,
        new Date(item.submitted_at).toLocaleDateString("en-PH"),
      ];
      doc.font("Helvetica").fontSize(8.4).fillColor("#0f172a");
      values.forEach((v, i) => {
        doc.text(String(v), x + 4, y + 5, { width: columns[i].width - 8, ellipsis: true });
        x += columns[i].width;
      });
      doc.y += rowHeight;
    });
  }

  finalizePdfWithFooter(doc, generatedAt);
  doc.end();
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

  if (format === "pdf" && Number(data.snapshot?.totalExpected || 0) === 0) {
    return res.status(422).json({
      message: "No compliance records found for the selected filters. PDF was not generated.",
    });
  }

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

  const doc = new PDFDocument({ margin: 42, size: "A4", bufferPages: true });
  doc.pipe(res);

  const generatedAt = new Date().toLocaleString("en-PH");
  const officeLabel = officeId ? `Office #${officeId}` : "All Offices";
  drawReportHeader(doc, {
    reportTitle: "COMPLIANCE PROGRESS EXECUTIVE REPORT",
    subtitle: "Compliance milestones and monthly performance",
    year,
    coverage: officeLabel,
    generatedAt,
  });

  drawSectionTitle(doc, "I. Executive Summary");
  drawMetricTable(doc, [
    { metric: "Total Expected Items", value: data.snapshot.totalExpected },
    { metric: "Reviewed Items", value: data.snapshot.reviewed },
    { metric: "Completion Percentage", value: `${Number(data.snapshot.completionPercentage || 0).toFixed(2)}%` },
    { metric: "Overdue / Blocked Items", value: data.snapshot.overdueBlocked },
    { metric: "Not Started", value: data.snapshot.milestones.NOT_STARTED },
    { metric: "In Progress", value: data.snapshot.milestones.IN_PROGRESS },
    { metric: "Under Review", value: data.snapshot.milestones.UNDER_REVIEW },
    { metric: "Compliant", value: data.snapshot.milestones.COMPLIANT },
    { metric: "Denied", value: data.snapshot.details.denied },
  ]);

  drawSectionTitle(doc, "II. Monthly Compliance Trend");
  drawMonthlyTrendTable(doc, data.monthlyTrend);

  doc.moveDown(0.8);
  doc
    .font("Helvetica-Oblique")
    .fontSize(8.5)
    .fillColor("#475569")
    .text("This is a system-generated report intended for monitoring, audit support, and management decision-making.");
  finalizePdfWithFooter(doc, generatedAt);
  doc.end();
}