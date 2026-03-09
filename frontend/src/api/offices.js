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

// Note: Backend doesn't have office stats endpoint yet, this is placeholder
export async function getOfficeStats() {
  const response = await api.get('/offices/stats');
  return response.data;
}
