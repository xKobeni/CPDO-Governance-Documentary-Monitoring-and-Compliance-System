import { pool } from "../config/db.js";

export async function listGovernanceAreas() {
  const { rows } = await pool.query(
    `SELECT id, code, name, description, sort_order, is_active
     FROM governance_areas
     ORDER BY sort_order, code`
  );
  return rows;
}