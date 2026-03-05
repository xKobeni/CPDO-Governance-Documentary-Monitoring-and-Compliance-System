/**
 * Axios API Instance Configuration
 * Handles all HTTP requests with interceptors for auth and error handling
 */

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { API_ENDPOINTS, STORAGE_KEYS, REQUEST_TIMEOUT, HTTP_STATUS } from './constants';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure retry logic
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response?.status >= 500);
  },
});

/**
 * Request Interceptor
 * Adds access token to Authorization header
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles token refresh, errors, and logout on 401
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    const isAuthRequest =
      requestUrl.includes(API_ENDPOINTS.AUTH.LOGIN) ||
      requestUrl.includes(API_ENDPOINTS.AUTH.REFRESH);

    // Handle 401 Unauthorized - Try to refresh token
    if (
      error.response?.status === HTTP_STATUS.UNAUTHORIZED &&
      !originalRequest?._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return Promise.reject(error);
        }

        // Call refresh endpoint
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        if (newRefreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear auth and redirect to login
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        
        // Dispatch logout event that auth store will listen to
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
