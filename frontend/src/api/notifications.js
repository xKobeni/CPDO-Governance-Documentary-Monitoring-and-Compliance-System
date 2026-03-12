import api from '../lib/axios';

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

function normalizeListResponse(responseData) {
  return {
    ...responseData,
    data: Array.isArray(responseData.data)
      ? responseData.data.map(normalizeNotification)
      : [],
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