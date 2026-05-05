import api from '../lib/axios';

const DEDUPE_WINDOW_MS = 2 * 60 * 1000;

function normalizeNotification(notification) {
  return {
    id: notification.id,
    userId: notification.user_id,
    type: notification.type,
    title: notification.title,
    body: notification.body ?? '',
    submissionId: notification.link_submission_id ?? null,
    isRead: Boolean(notification.is_read),
    createdAt: notification.created_at,
    actor: 'System',
    relatedTo: null,
  };
}

function dedupeNotifications(notifications) {
  const seen = new Set();
  const result = [];

  for (const notification of notifications) {
    const createdAtMs = new Date(notification.createdAt).getTime();
    const windowBucket = Number.isFinite(createdAtMs)
      ? Math.floor(createdAtMs / DEDUPE_WINDOW_MS)
      : notification.createdAt;
    const signature = [
      notification.type,
      notification.title,
      notification.body,
      notification.submissionId ?? '',
      windowBucket,
    ].join('|');

    if (seen.has(signature)) continue;
    seen.add(signature);
    result.push(notification);
  }

  return result;
}

function normalizeListResponse(responseData) {
  const normalized = Array.isArray(responseData.data)
    ? responseData.data.map(normalizeNotification)
    : [];

  return {
    ...responseData,
    data: dedupeNotifications(normalized),
  };
}

export async function getNotifications(params = {}) {
  const response = await api.get('/notifications', { params });
  return normalizeListResponse(response.data);
}

export async function getUnreadNotifications(params = {}) {
  const response = await api.get('/notifications/unread', { params });
  return normalizeListResponse(response.data);
}

export async function getUnreadNotificationCount() {
  const response = await api.get('/notifications/unread/count');
  return response.data;
}

export async function markNotificationAsRead(notificationId) {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return normalizeNotification(response.data.notification);
}

export async function markAllNotificationsAsRead() {
  const response = await api.patch('/notifications/all/read');
  return response.data;
}