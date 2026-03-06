import api from '../config/api';
import { API_ENDPOINTS } from '../config/constants';

export const getUnreadCountService = async () => {
  const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.COUNT);
  return response.data?.unreadCount ?? 0;
};
