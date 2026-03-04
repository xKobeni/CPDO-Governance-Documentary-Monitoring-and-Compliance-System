import { pool } from "../config/db.js";

export async function createSession({ userId, refreshTokenHash, userAgent, ipAddress, expiresAt }) {
  const { rows } = await pool.query(
    `INSERT INTO auth_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [userId, refreshTokenHash, userAgent ?? null, ipAddress ?? null, expiresAt]
  );
  return rows[0];
}

export async function revokeSession(sessionId) {
  await pool.query(
    `UPDATE auth_sessions SET revoked_at = now() WHERE id = $1`,
    [sessionId]
  );
}

export async function revokeAllSessionsByUserId(userId) {
  await pool.query(
    `UPDATE auth_sessions
     SET revoked_at = now()
     WHERE user_id = $1
       AND revoked_at IS NULL`,
    [userId]
  );
}

export async function findValidSessionByHash(refreshTokenHash) {
  const { rows } = await pool.query(
    `SELECT *
     FROM auth_sessions
     WHERE refresh_token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > now()
     LIMIT 1`,
    [refreshTokenHash]
  );
  return rows[0] || null;
}

export async function updateSessionActivity(sessionId) {
  await pool.query(
    `UPDATE auth_sessions SET last_activity_at = now() WHERE id = $1`,
    [sessionId]
  );
}