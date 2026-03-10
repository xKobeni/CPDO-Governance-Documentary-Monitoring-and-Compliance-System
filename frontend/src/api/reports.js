import api from '../lib/axios';

export async function getReportSummary(params = {}) {
  const response = await api.get('/reports/summary', { params });
  return response.data;
}

export async function getNoUploadReport(params = {}) {
  const response = await api.get('/reports/no-upload', { params });
  return response.data;
}
