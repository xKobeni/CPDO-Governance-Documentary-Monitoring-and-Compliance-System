/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import api from '../config/api';
import { API_ENDPOINTS, STORAGE_KEYS } from '../config/constants';

/**
 * Login with email and password
 */
export const loginService = async (email, password) => {
  const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
    email,
    password,
  });

  const { accessToken, refreshToken, user } = response.data;

  // Store tokens and user data
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

  return {
    accessToken,
    refreshToken,
    user,
  };
};

/**
 * Logout - Clear tokens and session
 */
export const logoutService = async () => {
  try {
    // Make logout request to backend
    await api.post(API_ENDPOINTS.AUTH.LOGOUT);
  } catch (error) {
    console.error('Logout API error:', error);
    // Continue with local logout even if API fails
  } finally {
    // Clear local storage
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
};

/**
 * Get current user info
 */
export const getMeService = async () => {
  const response = await api.get(API_ENDPOINTS.AUTH.ME);
  const user = response.data;

  // Update stored user data
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

  return user;
};

/**
 * Request password reset (forgot password)
 */
export const forgotPasswordService = async (email) => {
  const response = await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
    email,
  });
  return response.data;
};

/**
 * Reset password with token
 */
export const resetPasswordService = async (token, password, passwordConfirm) => {
  const response = await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
    token,
    password,
    passwordConfirm,
  });
  return response.data;
};

/**
 * Refresh access token
 */
export const refreshTokenService = async (refreshToken) => {
  const response = await api.post(API_ENDPOINTS.AUTH.REFRESH, {
    refreshToken,
  });

  const { accessToken, refreshToken: newRefreshToken } = response.data;

  // Update tokens
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  if (newRefreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
  }

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  return !!token;
};

/**
 * Get stored user from localStorage
 */
export const getStoredUser = () => {
  const userJson = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
};

/**
 * Get stored access token
 */
export const getStoredToken = () => {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
};
