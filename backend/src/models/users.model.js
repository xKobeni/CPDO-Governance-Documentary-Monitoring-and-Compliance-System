import { pool } from "../config/db.js";

export async function findUserAuthByEmail(email) {
  const { rows } = await pool.query(
    `SELECT
        u.id, u.email, u.password_hash, u.full_name, u.is_active,
        u.office_id,
        r.code as role_code, r.name as role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const { rows } = await pool.query(
    `SELECT
        u.id, u.email, u.full_name, u.is_active, u.office_id, u.created_at, u.updated_at,
        r.code as role_code, r.name as role_name,
        o.name as office_name, o.code as office_code
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN offices o ON o.id = u.office_id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createUser({ email, passwordHash, fullName, roleId, officeId }) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role_id, office_id)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, email, full_name, role_id, office_id, is_active, created_at`,
    [email.toLowerCase(), passwordHash, fullName, roleId, officeId ?? null]
  );
  return rows[0];
}

export async function listUsers(limit = 20, offset = 0) {
  const { rows } = await pool.query(
    `SELECT
        u.id, u.email, u.full_name, u.is_active, u.office_id, u.created_at, u.updated_at,
        r.code as role_code, r.name as role_name,
        o.name as office_name, o.code as office_code
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN offices o ON o.id = u.office_id
     ORDER BY u.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  
  const { rows: countRows } = await pool.query(`SELECT COUNT(*) as total FROM users`);
  const total = parseInt(countRows[0].total, 10);
  
  return { rows, total };
}

export async function setUserActive(userId, isActive) {
  const { rows } = await pool.query(
    `UPDATE users
     SET is_active = $2
     WHERE id = $1
     RETURNING id, is_active, updated_at`,
    [userId, isActive]
  );
  return rows[0] || null;
}

export async function updateLastLogin(userId) {
  await pool.query(
    `UPDATE users SET last_login_at = now() WHERE id = $1`,
    [userId]
  );
}