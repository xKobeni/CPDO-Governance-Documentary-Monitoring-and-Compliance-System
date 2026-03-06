/**
 * Dashboard Service
 * Handles all dashboard-related API calls
 */

import api from '../config/api';
import { API_ENDPOINTS } from '../config/constants';

/**
 * Get dashboard overview data
 * @param {Object} params - Query parameters
 * @param {number} params.year - Year for the report
 * @param {string} [params.governanceAreaId] - Optional governance area filter
 * @param {string} [params.officeId] - Optional office filter
 * @returns {Promise<Object>} Dashboard data with KPIs, charts, and recent submissions
 */
export const getDashboardOverview = async (params = {}) => {
  const year = params.year || new Date().getFullYear();
  const queryParams = new URLSearchParams({
    year,
    ...(params.governanceAreaId && { governanceAreaId: params.governanceAreaId }),
    ...(params.officeId && { officeId: params.officeId }),
  });

  const response = await api.get(`${API_ENDPOINTS.DASHBOARD.OVERVIEW}?${queryParams}`);
  return response.data;
};

/**
 * Get submissions list with filters
 * @param {Object} options - Filter options
 * @param {number} [options.limit] - Number of records to fetch
 * @param {number} [options.offset] - Pagination offset
 * @param {string} [options.status] - Filter by status
 * @param {string} [options.year] - Filter by year
 * @returns {Promise<Object>} Submissions list
 */
export const getSubmissions = async (options = {}) => {
  const queryParams = new URLSearchParams();
  if (options.limit) queryParams.append('limit', options.limit);
  if (options.offset) queryParams.append('offset', options.offset);
  if (options.status) queryParams.append('status', options.status);
  if (options.year) queryParams.append('year', options.year);

  const response = await api.get(`${API_ENDPOINTS.SUBMISSIONS.LIST}?${queryParams}`);
  return response.data;
};

/**
 * Get users list for admin dashboard
 * @param {Object} options - Filter options
 * @param {number} [options.limit] - Number of records to fetch
 * @param {number} [options.offset] - Pagination offset
 * @returns {Promise<Object>} Users list
 */
export const getUsers = async (options = {}) => {
  const queryParams = new URLSearchParams();
  if (options.limit) queryParams.append('limit', options.limit);
  if (options.offset) queryParams.append('offset', options.offset);

  const response = await api.get(`${API_ENDPOINTS.USERS.LIST}?${queryParams}`);
  return response.data;
};

/**
 * Get templates list
 * @param {Object} options - Filter options
 * @param {number} [options.limit] - Number of records to fetch
 * @param {number} [options.offset] - Pagination offset
 * @param {number} [options.year] - Filter by year
 * @returns {Promise<Object>} Templates list
 */
export const getTemplates = async (options = {}) => {
  const queryParams = new URLSearchParams();
  if (options.limit) queryParams.append('limit', options.limit);
  if (options.offset) queryParams.append('offset', options.offset);
  if (options.year) queryParams.append('year', options.year);

  const response = await api.get(`${API_ENDPOINTS.TEMPLATES.LIST}?${queryParams}`);
  return response.data;
};

/**
 * Get notifications list
 * @param {Object} options - Filter options
 * @param {number} [options.limit] - Number of records to fetch
 * @param {number} [options.offset] - Pagination offset
 * @returns {Promise<Object>} Notifications list
 */
export const getNotifications = async (options = {}) => {
  const queryParams = new URLSearchParams();
  if (options.limit) queryParams.append('limit', options.limit);
  if (options.offset) queryParams.append('offset', options.offset);

  const response = await api.get(`${API_ENDPOINTS.NOTIFICATIONS.LIST}?${queryParams}`);
  return response.data;
};

/**
 * Get user statistics
 * @returns {Promise<Object>} User statistics by role
 */
export const getUserStats = async () => {
  const response = await api.get(API_ENDPOINTS.ANALYTICS.USER_STATS);
  return response.data;
};

/**
 * Get recent activity feed
 * @param {Object} options - Filter options
 * @param {number} [options.limit] - Number of activities to fetch
 * @returns {Promise<Object>} Recent activity list
 */
export const getRecentActivity = async (options = {}) => {
  const queryParams = new URLSearchParams();
  if (options.limit) queryParams.append('limit', options.limit);

  const response = await api.get(`${API_ENDPOINTS.ANALYTICS.RECENT_ACTIVITY}?${queryParams}`);
  return response.data;
};

/**
 * Get office performance metrics
 * @param {Object} options - Filter options
 * @param {number} [options.year] - Year for metrics
 * @returns {Promise<Object>} Office performance data
 */
export const getOfficePerformance = async (options = {}) => {
  const queryParams = new URLSearchParams();
  if (options.year) queryParams.append('year', options.year);

  const response = await api.get(`${API_ENDPOINTS.ANALYTICS.OFFICE_PERFORMANCE}?${queryParams}`);
  return response.data;
};

/**
 * Get reviewer performance metrics
 * @param {Object} options - Filter options
 * @param {number} [options.year] - Year for metrics
 * @returns {Promise<Object>} Reviewer performance data
 */
export const getReviewerPerformance = async (options = {}) => {
  const queryParams = new URLSearchParams();
  if (options.year) queryParams.append('year', options.year);

  const response = await api.get(`${API_ENDPOINTS.ANALYTICS.REVIEWER_PERFORMANCE}?${queryParams}`);
  return response.data;
};
