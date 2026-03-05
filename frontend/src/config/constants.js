/**
 * API Endpoints Configuration
 * All backend API endpoints used in the application
 */

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // User endpoints
  USERS: {
    LIST: '/users',
    GET: (id) => `/users/${id}`,
    CREATE: '/users',
    UPDATE: (id) => `/users/${id}`,
    DELETE: (id) => `/users/${id}`,
    SET_ACTIVE: (id) => `/users/${id}/set-active`,
  },

  // Submission endpoints
  SUBMISSIONS: {
    LIST: '/submissions',
    GET: (id) => `/submissions/${id}`,
    CREATE: '/submissions',
    UPDATE: (id) => `/submissions/${id}`,
    REVIEW: (id) => `/submissions/${id}/review`,
  },

  // Templates endpoints
  TEMPLATES: {
    LIST: '/templates',
    GET: (id) => `/templates/${id}`,
    CREATE: '/templates',
    UPDATE: (id) => `/templates/${id}`,
    DELETE: (id) => `/templates/${id}`,
  },

  // Reports endpoints
  REPORTS: {
    LIST: '/reports',
    GET: (id) => `/reports/${id}`,
    EXPORT: (format) => `/reports/export?format=${format}`,
  },

  // Notifications endpoints
  NOTIFICATIONS: {
    LIST: '/notifications',
    COUNT: '/notifications/count',
    MARK_AS_READ: (id) => `/notifications/${id}/read`,
  },

  // Audit logs endpoints
  AUDIT_LOGS: {
    LIST: '/audit-logs',
  },
};

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  LOCKED: 423,
  SERVER_ERROR: 500,
};

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'cpdo_access_token',
  REFRESH_TOKEN: 'cpdo_refresh_token',
  USER: 'cpdo_user',
  THEME: 'cpdo-theme',
};

/**
 * Request timeouts (in milliseconds)
 */
export const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Token refresh buffer time (in milliseconds)
 * Refresh token when it has less than this time left to expiration
 */
export const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes
