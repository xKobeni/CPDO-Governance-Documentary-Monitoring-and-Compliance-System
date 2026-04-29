import { pool } from "../config/db.js";
import { sha256 } from "../utils/tokenHash.js";

export async function createEmailVerificationToken(userId, token, expiresAt) {
  const tokenHash = sha256(token);
  const result = await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt]
  );
  return result.rows[0] ?? null;
}

/** @returns {Promise<{ user_id: string } | null>} */
export async function findValidEmailVerificationToken(token) {
  const tokenHash = sha256(token);
  const result = await pool.query(
    `SELECT user_id
     FROM email_verification_tokens
     WHERE token_hash = $1 AND expires_at > now()`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function deleteEmailVerificationToken(userId, token) {
  const tokenHash = sha256(token);
  await pool.query(
    `DELETE FROM email_verification_tokens WHERE user_id = $1 AND token_hash = $2`,
    [userId, tokenHash]
  );
}

export async function revokeEmailVerificationTokens(userId) {
  await pool.query(`DELETE FROM email_verification_tokens WHERE user_id = $1`, [userId]);
}
