import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../api/notifications';

export const notificationKeys = {
  allLists: ['notifications', 'list'],
  unreadLists: ['notifications', 'unread'],
  list: (page, limit) => ['notifications', 'list', page, limit],
  unread: (page, limit) => ['notifications', 'unread', page, limit],
  unreadCount: ['notifications', 'unread-count'],
};

function updateListResponse(response, updater) {
  if (!response || !Array.isArray(response.data)) {
    return response;
  }

  return {
    ...response,
    data: updater(response.data),
  };
}

export function useNotifications({ page = 1, limit = 100, enabled = true } = {}) {
  return useQuery({
    queryKey: notificationKeys.list(page, limit),
    queryFn: () => getNotifications({ page, limit }),
    enabled,
  });
}

export function useUnreadNotifications({ page = 1, limit = 5, enabled = true } = {}) {
  return useQuery({
    queryKey: notificationKeys.unread(page, limit),
    queryFn: () => getUnreadNotifications({ page, limit }),
    enabled,
    refetchInterval: 60 * 1000,
  });
}

export function useUnreadNotificationCount({ enabled = true } = {}) {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: getUnreadNotificationCount,
    enabled,
    refetchInterval: 60 * 1000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (updatedNotification) => {
      queryClient.setQueriesData(
        { queryKey: notificationKeys.allLists },
        (response) => updateListResponse(response, (notifications) =>
          notifications.map((notification) =>
            notification.id === updatedNotification.id
              ? { ...notification, isRead: true }
              : notification
          )
        )
      );

      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadLists });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.setQueriesData(
        { queryKey: notificationKeys.allLists },
        (response) => updateListResponse(response, (notifications) =>
          notifications.map((notification) => ({ ...notification, isRead: true }))
        )
      );

      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadLists });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}