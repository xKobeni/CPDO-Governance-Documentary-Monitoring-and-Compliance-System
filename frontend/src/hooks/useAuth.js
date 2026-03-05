/**
 * useAuth Hook
 * Custom hook to use auth store throughout the application
 */

import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  return useAuthStore();
};
