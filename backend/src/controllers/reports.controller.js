import { pool } from "../config/db.js";

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