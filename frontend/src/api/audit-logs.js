import api from '../lib/axios';

// Audit Logs API calls
export async function getAuditLogs(params = {}) {
  const response = await api.get('/audit-logs', { params });
  return response.data;
}

export async function getAuditStats() {
  const response = await api.get('/audit-logs/stats');
  return response.data;
}

export async function exportAuditLogs(params = {}) {
  const response = await api.get('/audit-logs/export', {
    params,
    responseType: 'blob'
  });
  return response.data;
}