import api from '../lib/axios';

export async function getYears({ includeInactive = true } = {}) {
  const response = await api.get('/years', {
    params: { includeInactive },
  });
  return response.data; // { years: [...] }
}

export async function createYear(year) {
  const response = await api.post('/years', { year });
  return response.data; // { year: {...} }
}

export async function updateYear(id, { isActive }) {
  const response = await api.patch(`/years/${id}`, { isActive });
  return response.data; // { year: {...} }
}

