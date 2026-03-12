import {
  getUnreadNotifications,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "../models/notifications.model.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";

/**
 * Get unread notifications for current user
 */
export async function getUnreadHandler(req, res) {
  const { limit, offset, page } = getPaginationParams(req, 20, 100);
  const { notifications, total } = await getUnreadNotifications(req.user.sub, limit, offset);
  return res.json(formatPaginatedResponse(notifications, total, page, limit));
}

/**
 * Get all notifications for current user
 */
export async function getNotificationsHandler(req, res) {
  const { limit, offset, page } = getPaginationParams(req, 20, 100);
  const { notifications, total } = await getUserNotifications(req.user.sub, limit, offset);
  return res.json(formatPaginatedResponse(notifications, total, page, limit));
}

/**
 * Mark single notification as read
 */
export async function markAsReadHandler(req, res) {
  const notificationId = req.params.id;
  const notification = await markAsRead(notificationId, req.user.sub);
  
  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  return res.json({ notification });
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllAsReadHandler(req, res) {
  await markAllAsRead(req.user.sub);
  return res.json({ ok: true });
}

/**
 * Get unread count for current user
 */
export async function getUnreadCountHandler(req, res) {
  const count = await getUnreadCount(req.user.sub);
  return res.json({ unreadCount: count });
}
