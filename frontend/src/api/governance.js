import api from '../lib/axios';

export async function getGovernanceAreas() {
  const response = await api.get('/governance-areas');
  return response.data; // { governanceAreas: [...] }
}

export async function getGovernanceAreasWithStats(year) {
  const response = await api.get('/governance-areas/stats', { params: { year } });
  return response.data; // { governanceAreas: [...with stats], year }
}

export async function getGovernanceArea(id) {
  const response = await api.get(`/governance-areas/${id}`);
  return response.data; // { governanceArea: {...} }
}

export async function createGovernanceArea(data) {
  const response = await api.post('/governance-areas', data);
  return response.data; // { governanceArea: {...} }
}

export async function updateGovernanceArea(id, data) {
  const response = await api.patch(`/governance-areas/${id}`, data);
  return response.data; // { governanceArea: {...} }
}

export async function deleteGovernanceArea(id) {
  await api.delete(`/governance-areas/${id}`);
}

/** Get offices assigned to a governance area for a given year */
export async function getAssignedOffices(governanceAreaId, year) {
  const response = await api.get(`/governance-areas/${governanceAreaId}/assigned-offices`, { params: { year } });
  return response.data; // { data: [...] }
}

export async function getComplianceMatrix(year) {
  const response = await api.get("/governance-areas/compliance-matrix", { params: { year } });
  return response.data; // { year, cells: [] }
}

