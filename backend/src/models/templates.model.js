import { pool } from "../config/db.js";

export async function createTemplate({ governanceAreaId, year, title, notes, status, createdBy }) {
  const { rows } = await pool.query(
    `INSERT INTO checklist_templates (governance_area_id, year, title, notes, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [governanceAreaId, year, title, notes ?? null, status ?? "ACTIVE", createdBy ?? null]
  );
  return rows[0];
}

export async function getTemplateByGovYear(governanceAreaId, year) {
  const { rows } = await pool.query(
    `SELECT * FROM checklist_templates
     WHERE governance_area_id = $1 AND year = $2`,
    [governanceAreaId, year]
  );
  return rows[0] || null;
}

export async function listTemplatesByYear(year) {
  const { rows } = await pool.query(
    `SELECT t.*, ga.code as governance_code, ga.name as governance_name
     FROM checklist_templates t
     JOIN governance_areas ga ON ga.id = t.governance_area_id
     WHERE t.year = $1
     ORDER BY ga.sort_order, ga.code`,
    [year]
  );
  return rows;
}

export async function createChecklistItem(payload) {
  const {
    templateId, parentItemId, itemCode, title, description,
    isRequired, frequency, dueDate, allowedFileTypes, maxFiles,
    sortOrder, isActive
  } = payload;

  const { rows } = await pool.query(
    `INSERT INTO checklist_items
      (template_id, parent_item_id, item_code, title, description,
       is_required, frequency, due_date, allowed_file_types, max_files,
       sort_order, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      templateId,
      parentItemId ?? null,
      itemCode,
      title,
      description ?? null,
      isRequired ?? true,
      frequency ?? "ANNUAL",
      dueDate ?? null,
      allowedFileTypes ?? null,
      maxFiles ?? 1,
      sortOrder ?? 0,
      isActive ?? true
    ]
  );

  return rows[0];
}

export async function listTemplateItems(templateId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM checklist_items
     WHERE template_id = $1 AND is_active = TRUE
     ORDER BY sort_order, item_code`,
    [templateId]
  );
  return rows;
}