import { pool } from "../config/db.js";

export async function createOffice({ code, name, contactEmail }) {
  const { rows } = await pool.query(
    `INSERT INTO offices (code, name, contact_email)
     VALUES ($1,$2,$3)
     RETURNING *`,
    [code, name, contactEmail ?? null]
  );
  return rows[0];
}

export async function listOffices() {
  const { rows } = await pool.query(
    `SELECT id, code, name, contact_email, is_active, created_at, updated_at
     FROM offices
     ORDER BY name`
  );
  return rows;
}