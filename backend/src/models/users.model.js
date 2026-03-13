import { pool } from "../config/db.js";

export async function findUserAuthByEmail(email) {
  const { rows } = await pool.query(
    `SELECT
        u.id, u.email, u.password_hash, u.full_name, u.is_active,
        u.office_id, u.failed_login_attempts, u.account_locked_until,
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
        u.id, u.email, u.full_name, u.is_active, u.office_id, u.created_at, u.updated_at, u.last_login_at,
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
        u.id, u.email, u.full_name, u.is_active, u.office_id, u.created_at, u.updated_at, u.last_login_at,
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

export async function recordFailedLoginAttempt(userId) {
  // Increment failed attempts and record timestamp
  // Lock account for 15 minutes after 5 failed attempts
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_MINUTES = 15;

  const { rows } = await pool.query(
    `UPDATE users
     SET 
       failed_login_attempts = failed_login_attempts + 1,
       last_failed_attempt = now(),
       account_locked_until = CASE
         WHEN (failed_login_attempts + 1) >= $2
         THEN now() + INTERVAL '${LOCK_DURATION_MINUTES} minutes'
         ELSE account_locked_until
       END
     WHERE id = $1
     RETURNING id, failed_login_attempts, account_locked_until`,
    [userId, MAX_ATTEMPTS]
  );
  return rows[0] || null;
}

export async function resetFailedLoginAttempts(userId) {
  // Clear failed attempts and lock on successful login
  const { rows } = await pool.query(
    `UPDATE users
     SET 
       failed_login_attempts = 0,
       last_failed_attempt = NULL,
       account_locked_until = NULL
     WHERE id = $1
     RETURNING id, failed_login_attempts`,
    [userId]
  );
  return rows[0] || null;
}

export async function getFailedLoginAttempts(userId) {
  const { rows } = await pool.query(
    `SELECT id, failed_login_attempts, account_locked_until
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return rows[0] || null;
}

export async function updateUserProfile(userId, { fullName }) {
  const { rows } = await pool.query(
    `UPDATE users
     SET full_name = $2,
         updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [userId, fullName]
  );

  if (!rows[0]) return null;
  return findUserById(userId);
}

export async function updateUser(userId, { email, fullName, roleId, officeId }) {
  const { rows } = await pool.query(
    `UPDATE users
     SET email = COALESCE($2, email),
         full_name = COALESCE($3, full_name),
         role_id = COALESCE($4, role_id),
         office_id = COALESCE($5, office_id),
         updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [userId, email?.toLowerCase(), fullName, roleId, officeId]
  );

  if (!rows[0]) return null;
  return findUserById(userId);
}

export async function deleteUser(userId) {
  const { rows } = await pool.query(
    `DELETE FROM users
     WHERE id = $1
     RETURNING id`,
    [userId]
  );
  return rows[0] || null;
}

export async function updateUserPassword(userId, passwordHash) {
  const { rows } = await pool.query(
    `UPDATE users
     SET password_hash = $2,
         updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [userId, passwordHash]
  );
  return rows[0] || null;
}