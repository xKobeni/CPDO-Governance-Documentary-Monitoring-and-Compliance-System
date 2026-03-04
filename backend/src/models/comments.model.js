import { pool } from "../config/db.js";

/**
 * Create a comment on a submission
 */
export async function createComment({ submissionId, authorUserId, comment }) {
  const { rows } = await pool.query(
    `INSERT INTO submission_comments (submission_id, author_user_id, comment)
     VALUES ($1,$2,$3)
     RETURNING id, submission_id, author_user_id, comment, created_at`,
    [submissionId, authorUserId, comment]
  );
  return rows[0];
}

/**
 * Get all comments for a submission (paginated)
 */
export async function getSubmissionComments(submissionId, limit = 50, offset = 0) {
  const { rows } = await pool.query(
    `SELECT 
        c.id, c.submission_id, c.author_user_id, c.comment, c.created_at,
        u.full_name, u.email,
        r.code as role_code, r.name as role_name
     FROM submission_comments c
     JOIN users u ON u.id = c.author_user_id
     JOIN roles r ON r.id = u.role_id
     WHERE c.submission_id = $1
     ORDER BY c.created_at ASC
     LIMIT $2 OFFSET $3`,
    [submissionId, limit, offset]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) as total FROM submission_comments WHERE submission_id = $1`,
    [submissionId]
  );

  return {
    comments: rows,
    total: parseInt(countRows[0].total, 10),
  };
}

/**
 * Get single comment by ID
 */
export async function getCommentById(commentId) {
  const { rows } = await pool.query(
    `SELECT 
        c.id, c.submission_id, c.author_user_id, c.comment, c.created_at,
        u.full_name, u.email
     FROM submission_comments c
     JOIN users u ON u.id = c.author_user_id
     WHERE c.id = $1`,
    [commentId]
  );
  return rows[0] || null;
}

/**
 * Delete a comment (only by author)
 */
export async function deleteComment(commentId) {
  const { rows } = await pool.query(
    `DELETE FROM submission_comments WHERE id = $1 RETURNING id`,
    [commentId]
  );
  return rows[0] || null;
}

/**
 * Get comment count for a submission
 */
export async function getCommentCount(submissionId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) as count FROM submission_comments WHERE submission_id = $1`,
    [submissionId]
  );
  return parseInt(rows[0].count, 10);
}
