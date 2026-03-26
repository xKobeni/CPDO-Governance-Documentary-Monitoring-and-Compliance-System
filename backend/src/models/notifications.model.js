import { pool } from "../config/db.js";

/**
 * Create a notification for a user
 */
export async function createNotification({ userId, type, title, body, linkSubmissionId }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link_submission_id)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [userId, type, title, body ?? null, linkSubmissionId ?? null]
  );
  return rows[0];
}

/**
 * Bulk create notifications for multiple users
 */
export async function createNotificationsBulk(notifications) {
  if (!notifications || notifications.length === 0) return [];
  
  const values = [];
  const queryParams = [];
  let paramIndex = 1;

  for (const n of notifications) {
    values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
    queryParams.push(n.userId, n.type, n.title, n.body ?? null, n.linkSubmissionId ?? null);
  }

  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link_submission_id)
     VALUES ${values.join(", ")}
     RETURNING *`,
    queryParams
  );
  return rows;
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId, limit = 20, offset = 0) {
  const { rows } = await pool.query(
    `SELECT * FROM notifications
     WHERE user_id = $1 AND is_read = FALSE
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );

  return {
    notifications: rows,
    total: parseInt(countRows[0].total, 10),
  };
}

/**
 * Get all notifications for a user (paginated)
 */
export async function getUserNotifications(userId, limit = 20, offset = 0) {
  const { rows } = await pool.query(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`,
    [userId]
  );

  return {
    notifications: rows,
    total: parseInt(countRows[0].total, 10),
  };
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId, userId) {
  const { rows } = await pool.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  return rows[0] || null;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId) {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return parseInt(rows[0].count, 10);
}

/**
 * Delete old notifications (older than 30 days)
 */
export async function deleteOldNotifications(daysOld = 30) {
  await pool.query(
    `DELETE FROM notifications WHERE created_at < now() - interval '${daysOld} days'`
  );
}
