/**
 * Offices Service
 * Handles all office management API calls
 */

import api from '../config/api';
import { API_ENDPOINTS } from '../config/constants';

/**
 * Get list of all offices
 * @returns {Promise<Object>} Offices list with total count
 */
export const listOffices = async () => {
  const response = await api.get(API_ENDPOINTS.OFFICES.LIST);
  return response.data;
};

/**
 * Get a single office by ID
 * @param {string} officeId - The office ID
 * @returns {Promise<Object>} Office object
 */
export const getOffice = async (officeId) => {
  const response = await api.get(API_ENDPOINTS.OFFICES.GET(officeId));
  return response.data?.office;
};

/**
 * Create a new office
 * @param {Object} officeData - Office data
 * @param {string} officeData.code - Office code (unique, 2-20 chars)
 * @param {string} officeData.name - Office name (3-200 chars)
 * @param {string} [officeData.contactEmail] - Contact email (optional)
 * @returns {Promise<Object>} Created office object
 */
export const createOffice = async (officeData) => {
  const response = await api.post(API_ENDPOINTS.OFFICES.CREATE, {
    code: officeData.code.toUpperCase(),
    name: officeData.name,
    contactEmail: officeData.contactEmail || null,
  });
  return response.data?.office;
};

/**
 * Update office details
 * @param {string} officeId - The office ID
 * @param {Object} officeData - Data to update
 * @param {string} [officeData.code] - Office code
 * @param {string} [officeData.name] - Office name
 * @param {string} [officeData.contactEmail] - Contact email
 * @returns {Promise<Object>} Updated office object
 */
export const updateOffice = async (officeId, officeData) => {
  const payload = {};
  if (officeData.code !== undefined) payload.code = officeData.code.toUpperCase();
  if (officeData.name !== undefined) payload.name = officeData.name;
  if (officeData.contactEmail !== undefined) payload.contactEmail = officeData.contactEmail || null;

  const response = await api.patch(API_ENDPOINTS.OFFICES.UPDATE(officeId), payload);
  return response.data?.office;
};

/**
 * Update office active status
 * @param {string} officeId - The office ID
 * @param {boolean} isActive - Whether the office is active
 * @returns {Promise<Object>} Updated office object
 */
export const setOfficeActive = async (officeId, isActive) => {
  const response = await api.patch(API_ENDPOINTS.OFFICES.SET_ACTIVE(officeId), {
    isActive,
  });
  return response.data?.office;
};

/**
 * Delete an office
 * Note: Will fail if office has associated users
 * @param {string} officeId - The office ID
 * @returns {Promise<Object>} Response object
 */
export const deleteOffice = async (officeId) => {
  const response = await api.delete(API_ENDPOINTS.OFFICES.DELETE(officeId));
  return response.data;
};
