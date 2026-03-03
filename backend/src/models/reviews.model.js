import { pool } from "../config/db.js";

export async function createReview({ submissionId, reviewedBy, action, decisionNotes }) {
  const { rows } = await pool.query(
    `INSERT INTO reviews (submission_id, reviewed_by, action, decision_notes)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [submissionId, reviewedBy, action, decisionNotes ?? null]
  );
  return rows[0];
}

export async function addVerificationCheck({ reviewId, checkKey, isPassed, notes }) {
  const { rows } = await pool.query(
    `INSERT INTO verification_checks (review_id, check_key, is_passed, notes)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (review_id, check_key)
     DO UPDATE SET is_passed = EXCLUDED.is_passed, notes = EXCLUDED.notes
     RETURNING *`,
    [reviewId, checkKey, isPassed, notes ?? null]
  );
  return rows[0];
}

export async function listReviews(submissionId) {
  const { rows } = await pool.query(
    `SELECT r.*, u.full_name as reviewer_name
     FROM reviews r
     JOIN users u ON u.id = r.reviewed_by
     WHERE r.submission_id = $1
     ORDER BY r.reviewed_at DESC`,
    [submissionId]
  );
  return rows;
}