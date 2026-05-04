import { z } from "zod";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import {
  listGovernanceAreas,
  getGovernanceAreaById,
  createGovernanceArea,
  updateGovernanceArea,
  deleteGovernanceArea,
  listGovernanceAreasWithStats,
  getComplianceMatrix,
} from "../models/governance.model.js";

const createSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(3).max(200),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase().optional(),
  name: z.string().min(3).max(200).optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function listGovernanceAreasHandler(req, res) {
  const areas = await listGovernanceAreas();
  return res.json({ governanceAreas: areas });
}

export async function getGovernanceAreaHandler(req, res) {
  const area = await getGovernanceAreaById(req.params.id);
  if (!area) return res.status(404).json({ message: "Governance area not found" });
  return res.json({ governanceArea: area });
}

export async function createGovernanceAreaHandler(req, res) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
  }

  try {
    const area = await createGovernanceArea(parsed.data);
    return res.status(201).json({ governanceArea: area });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Governance area code already exists" });
    }
    throw err;
  }
}

export async function updateGovernanceAreaHandler(req, res) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
  }

  try {
    const area = await updateGovernanceArea(req.params.id, parsed.data);
    if (!area) return res.status(404).json({ message: "Governance area not found" });
    return res.json({ governanceArea: area });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Governance area code already exists" });
    }
    throw err;
  }
}

export async function deleteGovernanceAreaHandler(req, res) {
  try {
    const deleted = await deleteGovernanceArea(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Governance area not found" });
    return res.json({ message: "Governance area deleted successfully" });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(409).json({ message: "Cannot delete governance area with associated templates" });
    }
    throw err;
  }
}

export async function areasWithStatsHandler(req, res) {
  const year = parseInt(req.query.year, 10);
  if (!year || year < 2000 || year > 2100) {
    return res.status(400).json({ message: "Valid year is required (e.g. ?year=2026)" });
  }
  const areas = await listGovernanceAreasWithStats(year);
  return res.json({ governanceAreas: areas, year });
}

export async function complianceMatrixHandler(req, res) {
  const year = parseInt(req.query.year, 10);
  if (!year || year < 2000 || year > 2100) {
    return res.status(400).json({ message: "Valid year is required (e.g. ?year=2026)" });
  }
  const matrix = await getComplianceMatrix(year);
  return res.json(matrix);
}

export async function complianceMatrixExportHandler(req, res) {
  const year = parseInt(req.query.year, 10);
  if (!year || year < 2000 || year > 2100) {
    return res.status(400).json({ message: "Valid year is required (e.g. ?year=2026)" });
  }

  const format = String(req.query.format || "xlsx").toLowerCase();
  if (!["xlsx", "pdf"].includes(format)) {
    return res.status(400).json({ message: "Invalid format. Use xlsx or pdf." });
  }

  const matrix = await getComplianceMatrix(year);
  const { offices = [], categories = [], cells = [] } = matrix || {};
  if (offices.length === 0 || categories.length === 0) {
    return res.status(422).json({ message: "No compliance matrix data found for the selected year." });
  }

  const fileStem = `compliance-matrix-${year}`;
  if (format === "xlsx") {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileStem}.xlsx"`);

    const cellMap = new Map(cells.map((c) => [`${c.officeId}:${c.categoryId}`, c]));
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Compliance Matrix");
    ws.addRow(["Compliance Matrix"]);
    ws.addRow(["Year", year]);
    ws.addRow([]);

    const header = ["Governance Code", "Governance Name", "Category Code", "Category Name", ...offices.map((o) => o.code)];
    ws.addRow(header);

    for (const cat of categories) {
      const row = [cat.governanceCode, cat.governanceName, cat.categoryCode, cat.categoryName];
      for (const office of offices) {
        const cell = cellMap.get(`${office.id}:${cat.id}`);
        const status = cell?.status || "NOT_SUBMITTED";
        row.push(status);
      }
      ws.addRow(row);
    }

    ws.columns = [
      { width: 18 },
      { width: 28 },
      { width: 18 },
      { width: 36 },
      ...offices.map(() => ({ width: 16 })),
    ];
    await workbook.xlsx.write(res);
    return res.end();
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileStem}.pdf"`);
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  doc.pipe(res);

  const generatedAt = new Date().toLocaleString("en-PH");
  const cellMap = new Map(cells.map((c) => [`${c.officeId}:${c.categoryId}`, c]));
  const statusCodeMap = {
    APPROVED: "A",
    PENDING: "P",
    REVISION_REQUESTED: "R",
    NOT_SUBMITTED: "N",
  };

  const left = doc.page.margins.left;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const rowHeight = 15;
  const baseWidths = [38, 48, 150, 56]; // Gov, Cat, Category, Subm/Tot
  const baseHeaders = ["Gov", "Cat", "Category", "Subm/Tot"];

  const officeChunkSize = 8;
  const officeChunks = [];
  for (let i = 0; i < offices.length; i += officeChunkSize) {
    officeChunks.push(offices.slice(i, i + officeChunkSize));
  }

  const drawPageIntro = (chunk, chunkIdx, totalChunks) => {
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#0f172a").text("Compliance Matrix Report", { align: "center" });
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor("#334155")
      .text(`Year: ${year}   Generated: ${generatedAt}`, { align: "center" });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#475569")
      .text(`Office Set ${chunkIdx + 1} of ${totalChunks}: ${chunk.map((o) => o.code).join(", ")}`);
    doc
      .moveDown(0.2)
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor("#475569")
      .text("Legend: A=Approved, P=Pending, R=Needs Revision, N=Not Submitted");
    doc.moveDown(0.4);
  };

  const drawHeader = (chunk) => {
    const officeWidth = Math.floor((totalWidth - baseWidths.reduce((a, b) => a + b, 0)) / chunk.length);
    const colWidths = [...baseWidths, ...chunk.map(() => officeWidth)];
    const headers = [...baseHeaders, ...chunk.map((o) => o.code)];

    const headerY = doc.y;
    doc.rect(left, headerY, totalWidth, rowHeight).fill("#e2e8f0");
    let x = left;
    doc.font("Helvetica-Bold").fontSize(8.4).fillColor("#0f172a");
    headers.forEach((h, idx) => {
      doc.text(h, x + 2, headerY + 4, { width: colWidths[idx] - 4, ellipsis: true, lineBreak: false });
      x += colWidths[idx];
    });
    doc.y = headerY + rowHeight;
    return colWidths;
  };

  officeChunks.forEach((chunk, chunkIdx) => {
    if (chunkIdx > 0) doc.addPage();
    drawPageIntro(chunk, chunkIdx, officeChunks.length);
    let colWidths = drawHeader(chunk);

    categories.forEach((cat, rowIdx) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 22) {
        doc.addPage();
        drawPageIntro(chunk, chunkIdx, officeChunks.length);
        colWidths = drawHeader(chunk);
      }

      const y = doc.y;
      doc.rect(left, y, totalWidth, rowHeight).fill(rowIdx % 2 === 0 ? "#ffffff" : "#f8fafc");
      let x = left;
      const chunkSubmitted = chunk.reduce((sum, office) => {
        const cell = cellMap.get(`${office.id}:${cat.id}`);
        return sum + Number(cell?.counts?.submitted || 0);
      }, 0);
      const chunkTotal = chunk.reduce((sum, office) => {
        const cell = cellMap.get(`${office.id}:${cat.id}`);
        return sum + Number(cell?.counts?.totalItems || 0);
      }, 0);

      const values = [cat.governanceCode, cat.categoryCode, cat.categoryName, `${chunkSubmitted}/${chunkTotal}`];
      chunk.forEach((office) => {
        const cell = cellMap.get(`${office.id}:${cat.id}`);
        values.push(statusCodeMap[cell?.status] || "N");
      });

      doc.font("Helvetica").fontSize(8.2).fillColor("#0f172a");
      values.forEach((value, idx) => {
        const align = idx >= baseWidths.length ? "center" : "left";
        doc.text(String(value), x + 2, y + 4, {
          width: colWidths[idx] - 4,
          ellipsis: true,
          lineBreak: false,
          align,
        });
        x += colWidths[idx];
      });
      doc.y += rowHeight;
    });
  });

  doc.end();
}

