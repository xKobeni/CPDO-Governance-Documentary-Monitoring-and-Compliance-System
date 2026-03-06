export const ROLES = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  OFFICE: 'OFFICE',
};

export const PAGE_ACCESS = {
  dashboard: [ROLES.ADMIN, ROLES.STAFF, ROLES.OFFICE],
  submissions: [ROLES.ADMIN, ROLES.STAFF, ROLES.OFFICE],
  templates: [ROLES.ADMIN],
  reports: [ROLES.ADMIN, ROLES.STAFF, ROLES.OFFICE],
  users: [ROLES.ADMIN],
  offices: [ROLES.ADMIN],
  settings: [ROLES.ADMIN, ROLES.STAFF, ROLES.OFFICE],
  notifications: [ROLES.ADMIN, ROLES.STAFF, ROLES.OFFICE],
  'audit-logs': [ROLES.ADMIN],
};

export function hasRole(userRole, ...allowedRoles) {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export function canAccessPage(userRole, pageId) {
  const allowedRoles = PAGE_ACCESS[pageId];
  if (!allowedRoles) return true;
  return hasRole(userRole, ...allowedRoles);
}
