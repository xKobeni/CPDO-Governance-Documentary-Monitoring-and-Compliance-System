/**
 * Users Service
 * Handles all user management API calls
 */

import api from '../config/api';
import { API_ENDPOINTS } from '../config/constants';

/**
 * Get list of all users with pagination
 * @param {Object} options - Filter options
 * @param {number} [options.limit] - Number of records to fetch
 * @param {number} [options.offset] - Pagination offset
 * @param {number} [options.page] - Page number
 * @returns {Promise<Object>} Users list with pagination
 */
export const listUsers = async (options = {}) => {
  const queryParams = new URLSearchParams();
  if (options.limit) queryParams.append('limit', options.limit);
  if (options.offset) queryParams.append('offset', options.offset);
  if (options.page) queryParams.append('page', options.page);

  const response = await api.get(`${API_ENDPOINTS.USERS.LIST}?${queryParams}`);
  return response.data;
};

/**
 * Get a single user by ID
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} User object
 */
export const getUser = async (userId) => {
  const response = await api.get(API_ENDPOINTS.USERS.GET(userId));
  return response.data?.user;
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password (min 8 characters)
 * @param {string} userData.fullName - User full name
 * @param {string} userData.roleCode - Role code (ADMIN, STAFF, OFFICE)
 * @param {string} [userData.officeId] - Office ID (required if roleCode is OFFICE)
 * @returns {Promise<Object>} Created user object
 */
export const createUser = async (userData) => {
  const response = await api.post(API_ENDPOINTS.USERS.CREATE, {
    email: userData.email,
    password: userData.password,
    fullName: userData.fullName,
    roleCode: userData.roleCode,
    officeId: userData.officeId || null,
  });
  return response.data?.user;
};

/**
 * Update user active status
 * @param {string} userId - The user ID
 * @param {boolean} isActive - Whether the user is active
 * @returns {Promise<Object>} Updated user object
 */
export const setUserActive = async (userId, isActive) => {
  const response = await api.patch(API_ENDPOINTS.USERS.SET_ACTIVE(userId), {
    isActive,
  });
  return response.data?.user;
};

/**
 * Delete a user (if backend supports it)
 * Note: Backend may not have implemented this yet
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Response object
 */
export const deleteUser = async (userId) => {
  const response = await api.delete(API_ENDPOINTS.USERS.DELETE(userId));
  return response.data;
};

/**
 * Update user data (if backend supports it)
 * Note: Backend may not have implemented this yet
 * @param {string} userId - The user ID
 * @param {Object} userData - Data to update
 * @returns {Promise<Object>} Updated user object
 */
export const updateUser = async (userId, userData) => {
  const response = await api.patch(API_ENDPOINTS.USERS.UPDATE(userId), userData);
  return response.data?.user;
};
