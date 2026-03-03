import { pool } from "../config/db.js";

export async function getRoleByCode(code) {
  const { rows } = await pool.query(
    `SELECT id, code, name FROM roles WHERE code = $1`,
    [code]
  );
  return rows[0] || null;
}

export async function listRoles() {
  const { rows } = await pool.query(
    `SELECT id, code, name, created_at FROM roles ORDER BY code`
  );
  return rows;
}