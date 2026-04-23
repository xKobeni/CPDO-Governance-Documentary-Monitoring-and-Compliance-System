import api from '../lib/axios';

// Office Management API calls
export async function getOffices(params = {}) {
  const response = await api.get('/offices', { params });
  return response.data;
}

export async function getOffice(officeId) {
  const response = await api.get(`/offices/${officeId}`);
  return response.data;
}

export async function createOffice(officeData) {
  const response = await api.post('/offices', officeData);
  return response.data;
}

export async function updateOffice(officeId, officeData) {
  const response = await api.patch(`/offices/${officeId}`, officeData);
  return response.data;
}

export async function deleteOffice(officeId) {
  await api.delete(`/offices/${officeId}`);
}

export async function toggleOfficeStatus(officeId, isActive) {
  const response = await api.patch(`/offices/${officeId}/active`, { isActive });
  return response.data;
}

// Backend office-related stats live under /analytics
export async function getOfficeStats(params = {}) {
  const response = await api.get('/analytics/office-performance', { params });
  return response.data;
}

// ── Governance Assignments ────────────────────────────────────────────────────

/** Get all governance area assignments for an office (admin view) */
export async function getOfficeAssignments(officeId, year) {
  const response = await api.get(`/offices/${officeId}/assignments`, { params: { year } });
  return response.data;
}

/** Bulk-replace assignments for an office+year (admin only) */
export async function setOfficeAssignments(officeId, year, governanceAreaIds) {
  const response = await api.put(`/offices/${officeId}/assignments`, { year, governanceAreaIds });
  return response.data;
}

/** Get governance options with assignment readiness for a year */
export async function getAssignmentOptions(year) {
  const response = await api.get("/offices/assignment-options", { params: { year } });
  return response.data;
}

/** Get full grouped checklist for an office (used by Office Head + admin) */
export async function getOfficeChecklist(officeId, year) {
  const response = await api.get(`/offices/${officeId}/checklist`, { params: { year } });
  return response.data;
}
