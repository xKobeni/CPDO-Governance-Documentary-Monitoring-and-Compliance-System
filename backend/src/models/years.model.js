import { pool } from "../config/db.js";

export async function ensureCurrentYearExists() {
  const currentYear = new Date().getFullYear();
  await pool.query(
    `INSERT INTO years (year, is_active)
     VALUES ($1, TRUE)
     ON CONFLICT (year) DO NOTHING`,
    [currentYear]
  );
}

export async function listYears({ includeInactive = true } = {}) {
  const where = includeInactive ? "" : "WHERE is_active = TRUE";
  const { rows } = await pool.query(
    `SELECT * FROM years ${where} ORDER BY year DESC`
  );
  return rows;
}

export async function createYear({ year, isActive = true }) {
  const { rows } = await pool.query(
    `INSERT INTO years (year, is_active)
     VALUES ($1, $2)
     ON CONFLICT (year) DO UPDATE
       SET is_active = EXCLUDED.is_active
     RETURNING *`,
    [year, isActive]
  );
  return rows[0];
}

export async function updateYear(id, { isActive }) {
  const sets = [];
  const params = [];
  let i = 1;

  if (isActive !== undefined) {
    sets.push(`is_active = $${i++}`);
    params.push(isActive);
  }

  if (sets.length === 0) {
    const { rows } = await pool.query(`SELECT * FROM years WHERE id = $1`, [id]);
    return rows[0] || null;
  }

  params.push(id);
  const { rows } = await pool.query(
    `UPDATE years SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    params
  );
  return rows[0] || null;
}

