/**
 * Zustand Auth Store
 * Global state management for authentication
 */

import { create } from 'zustand';
import {
  loginService,
  logoutService,
  getMeService,
  getStoredUser,
  getStoredToken,
} from '../services/authService';
import { HTTP_STATUS } from '../config/constants';

export const useAuthStore = create((set) => ({
  // State
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  loginError: {
    message: null,
    attemptsRemaining: null,
    isLocked: false,
    lockedUntil: null,
  },

  /**
   * Initialize auth state from localStorage
   */
  initializeAuth: async () => {
    const token = getStoredToken();
    if (token) {
      const storedUser = getStoredUser();
      set({
        user: storedUser,
        isAuthenticated: true,
      });

      // Try to refresh user data from backend
      try {
        const currentUser = await getMeService();
        set({ user: currentUser });
      } catch (error) {
        console.error('Failed to get user data:', error);
      }
    }
  },

  /**
   * Login user
   */
  login: async (email, password) => {
    set({ isLoading: true, error: null, loginError: { message: null, attemptsRemaining: null, isLocked: false, lockedUntil: null } });
    try {
      const { user } = await loginService(email, password);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        loginError: { message: null, attemptsRemaining: null, isLocked: false, lockedUntil: null },
      });
      return { success: true, user };
    } catch (error) {
      const { status, data } = error.response || {};
      const isLocked = status === HTTP_STATUS.LOCKED;
      const isInvalidCredentials = status === HTTP_STATUS.UNAUTHORIZED;
      
      let errorMessage = 'Login failed';
      if (isLocked) {
        errorMessage = data?.message || 'Account is locked. Try again in 15 minutes.';
      } else if (isInvalidCredentials) {
        errorMessage = data?.message || 'Invalid credentials or wrong email/password';
      } else {
        errorMessage = data?.message || error.message || 'Login failed';
      }

      const loginError = {
        message: errorMessage,
        attemptsRemaining: data?.attemptsRemaining ?? null,
        isLocked,
        lockedUntil: data?.lockedUntil ?? null,
      };

      set({
        isLoading: false,
        error: errorMessage,
        loginError,
      });
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    set({ isLoading: true });
    try {
      await logoutService();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if API call fails
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  /**
   * Clear error message
   */
  clearError: () => set({ error: null, loginError: { message: null, attemptsRemaining: null, isLocked: false, lockedUntil: null } }),

  /**
   * Manual logout (used by API interceptor when token expires)
   */
  forceLogout: () => {
    set({
      user: null,
      isAuthenticated: false,
      error: null,
      loginError: { message: null, attemptsRemaining: null, isLocked: false, lockedUntil: null },
    });
  },
}));

/**
 * Listen for logout events from API interceptor
 */
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    const { forceLogout } = useAuthStore.getState();
    forceLogout();
  });
}
