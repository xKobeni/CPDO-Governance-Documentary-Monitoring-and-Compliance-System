/**
 * API Error Handler Utilities
 * Handles and formats error messages from API responses
 */

import { HTTP_STATUS } from '../config/constants';

/**
 * Extract error message from API response
 */
export const getErrorMessage = (error) => {
  // Axios error with response
  if (error.response) {
    const { status, data } = error.response;

    // Server provided a specific error message
    if (data?.message) {
      return data.message;
    }

    // Handle based on status code
    switch (status) {
      case HTTP_STATUS.BAD_REQUEST:
        return data?.error || 'Invalid request. Please check your input.';
      case HTTP_STATUS.UNAUTHORIZED:
        return 'Invalid credentials. Please try again.';
      case HTTP_STATUS.FORBIDDEN:
        return 'You do not have permission to access this resource.';
      case HTTP_STATUS.NOT_FOUND:
        return 'Resource not found.';
      case HTTP_STATUS.LOCKED:
        return 'Account is locked. Please try again later.';
      case HTTP_STATUS.SERVER_ERROR:
        return 'Server error. Please try again later.';
      default:
        return `Error: ${data?.error || 'Something went wrong'}`;
    }
  }

  // Network error
  if (error.message === 'Network Error') {
    return 'Network error. Please check your connection.';
  }

  // Timeout error
  if (error.code === 'ECONNABORTED') {
    return 'Request timeout. Please try again.';
  }

  // Generic error
  return error.message || 'An error occurred. Please try again.';
};

/**
 * Extract detailed login error info including attempts remaining
 */
export const getLoginErrorDetails = (error) => {
  if (error.response?.data) {
    const { status, data } = error.response;
    return {
      message: data.message || getErrorMessage(error),
      status,
      attemptsRemaining: data.attemptsRemaining ?? null,
      failedAttempts: data.failedAttempts ?? null,
      lockedUntil: data.lockedUntil ?? null,
    };
  }
  return {
    message: getErrorMessage(error),
    status: null,
    attemptsRemaining: null,
    failedAttempts: null,
    lockedUntil: null,
  };
};

/**
 * Get field-specific errors from API validation response
 * Expected format: { errors: { fieldName: ['error1', 'error2'] } }
 */
export const getFieldErrors = (error) => {
  if (error.response?.data?.errors) {
    const errors = {};
    Object.entries(error.response.data.errors).forEach(([field, messages]) => {
      errors[field] = Array.isArray(messages) ? messages[0] : messages;
    });
    return errors;
  }
  return {};
};

/**
 * Check if error is due to network/connection issues
 */
export const isNetworkError = (error) => {
  return !error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error';
};

/**
 * Check if error is due to authentication (401)
 */
export const isAuthError = (error) => {
  return error.response?.status === HTTP_STATUS.UNAUTHORIZED;
};

/**
 * Check if error is due to permission (403)
 */
export const isPermissionError = (error) => {
  return error.response?.status === HTTP_STATUS.FORBIDDEN;
};

/**
 * Check if error is a validation error (400)
 */
export const isValidationError = (error) => {
  return error.response?.status === HTTP_STATUS.BAD_REQUEST;
};

/**
 * Format error for display in UI
 */
export const formatApiError = (error, defaultMessage = 'An error occurred') => {
  if (!error) return defaultMessage;

  const message = getErrorMessage(error);
  const fieldErrors = getFieldErrors(error);

  return {
    message,
    fieldErrors,
    isNetwork: isNetworkError(error),
    isAuth: isAuthError(error),
    isPermission: isPermissionError(error),
    isValidation: isValidationError(error),
  };
};
