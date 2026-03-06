/**
 * Analytics endpoint for user statistics and activity data
 */

import { pool } from "../config/db.js";

/**
 * Get user statistics (count by role)
 */
export async function getUserStatsHandler(req, res) {
  const result = await pool.query(
    `SELECT r.code AS role, COUNT(u.id)::int AS count
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.is_active = TRUE
     GROUP BY r.code, r.id
     ORDER BY r.id`
  );

  const stats = {
    total: 0,
    byRole: {
      ADMIN: 0,
      STAFF: 0,
      OFFICE: 0
    }
  };

  for (const row of result.rows) {
    stats.byRole[row.role] = Number(row.count || 0);
    stats.total += Number(row.count || 0);
  }

  return res.json(stats);
}

/**
 * Get recent activity (audit logs + comments)
 */
export async function getRecentActivityHandler(req, res) {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

  // Get recent audit logs
  const auditResult = await pool.query(
    `SELECT 
        'audit' AS type,
        al.id,
        al.created_at AS timestamp,
        al.action,
        u.full_name AS user_name,
        al.entity_type,
        al.entity_id,
        al.action AS title
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_user_id
     ORDER BY al.created_at DESC
     LIMIT $1`,
    [limit]
  );

  // Get recent comments
  const commentsResult = await pool.query(
    `SELECT 
        'comment' AS type,
        c.id,
        c.created_at AS timestamp,
        'COMMENT' AS action,
        u.full_name AS user_name,
        'SUBMISSION' AS entity_type,
        c.submission_id AS entity_id,
        u.full_name || ' commented' AS title
     FROM submission_comments c
     JOIN users u ON u.id = c.author_user_id
     ORDER BY c.created_at DESC
     LIMIT $1`,
    [limit / 2]
  );

  const activity = [
    ...auditResult.rows,
    ...commentsResult.rows
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

  return res.json({ activity, total: activity.length });
}

/**
 * Get office performance metrics
 */
export async function getOfficePerformanceHandler(req, res) {
  const year = parseInt(req.query.year) || new Date().getFullYear();

  const result = await pool.query(
    `SELECT 
        o.id,
        o.name,
        COUNT(DISTINCT s.id)::int AS totalSubmissions,
        SUM(CASE WHEN s.status = 'APPROVED' THEN 1 ELSE 0 END)::int AS approvedCount,
        SUM(CASE WHEN s.status = 'DENIED' THEN 1 ELSE 0 END)::int AS deniedCount,
        SUM(CASE WHEN s.status = 'REVISION_REQUESTED' THEN 1 ELSE 0 END)::int AS revisionCount,
        SUM(CASE WHEN s.status = 'PENDING' THEN 1 ELSE 0 END)::int AS pendingCount
     FROM offices o
     LEFT JOIN submissions s ON s.office_id = o.id AND s.year = $1
     WHERE o.is_active = TRUE
     GROUP BY o.id, o.name
     ORDER BY totalSubmissions DESC
     LIMIT 10`,
    [year]
  );

  const offices = result.rows.map(row => ({
    ...row,
    approvalRate: row.totalSubmissions > 0 
      ? ((row.approvedCount / (row.totalSubmissions - row.pendingCount)) * 100).toFixed(1)
      : 0,
    completionRate: row.totalSubmissions > 0 
      ? (((row.approvedCount + row.deniedCount + row.revisionCount) / row.totalSubmissions) * 100).toFixed(1)
      : 0
  }));

  return res.json({ year, offices });
}

/**
 * Get reviewer performance metrics
 */
export async function getReviewerPerformanceHandler(req, res) {
  const year = parseInt(req.query.year) || new Date().getFullYear();

  const result = await pool.query(
    `SELECT 
        u.id,
        u.full_name,
        r.code AS role,
        COUNT(DISTINCT rev.id)::int AS totalReviews,
        SUM(CASE WHEN rev.action = 'APPROVE' THEN 1 ELSE 0 END)::int AS approved,
        SUM(CASE WHEN rev.action = 'DENY' THEN 1 ELSE 0 END)::int AS denied,
        SUM(CASE WHEN rev.action = 'REQUEST_REVISION' THEN 1 ELSE 0 END)::int AS revisions,
        ROUND(AVG(EXTRACT(DAY FROM rev.reviewed_at - s.submitted_at))::numeric, 1)::float AS avgReviewDays
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN reviews rev ON rev.reviewed_by = u.id AND EXTRACT(YEAR FROM rev.reviewed_at) = $1
     LEFT JOIN submissions s ON s.id = rev.submission_id
     WHERE u.is_active = TRUE AND r.code IN ('ADMIN', 'STAFF')
     GROUP BY u.id, u.full_name, r.code
     HAVING COUNT(DISTINCT rev.id) > 0
     ORDER BY totalReviews DESC
     LIMIT 10`,
    [year]
  );

  const reviewers = result.rows.map(row => ({
    ...row,
    approvalRate: row.totalReviews > 0 
      ? ((row.approved / row.totalReviews) * 100).toFixed(1)
      : 0
  }));

  return res.json({ year, reviewers });
}
