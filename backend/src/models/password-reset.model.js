import { pool } from "../config/db.js";
import { sha256 } from "../utils/tokenHash.js";

/**
 * Create a password reset token for a user.
 * @param {string} userId - User ID
 * @param {string} token - Raw token (will be hashed before storage)
 * @param {Date} expiresAt - Expiration time
 * @returns {Promise<{ id: string } | null>}
 */
export async function createPasswordResetToken(userId, token, expiresAt) {
  const tokenHash = sha256(token);
  const result = await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt]
  );
  return result.rows[0] ?? null;
}

/**
 * Find a valid (non-expired) password reset token and return the user ID.
 * @param {string} token - Raw token from user
 * @returns {Promise<{ userId: string } | null>}
 */
export async function findValidResetToken(token) {
  const tokenHash = sha256(token);
  const result = await pool.query(
    `SELECT user_id
     FROM password_reset_tokens
     WHERE token_hash = $1 AND expires_at > now()`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

/**
 * Delete a reset token (after successful use or when creating a new one).
 * @param {string} userId - User ID (optional, for revoking all tokens for user)
 * @param {string} [token] - Optional specific token hash; if omitted, revokes all for user
 */
export async function revokeResetTokens(userId, token) {
  if (token) {
    const tokenHash = sha256(token);
    await pool.query(
      `DELETE FROM password_reset_tokens WHERE user_id = $1 AND token_hash = $2`,
      [userId, tokenHash]
    );
  } else {
    await pool.query(
      `DELETE FROM password_reset_tokens WHERE user_id = $1`,
      [userId]
    );
  }
}
