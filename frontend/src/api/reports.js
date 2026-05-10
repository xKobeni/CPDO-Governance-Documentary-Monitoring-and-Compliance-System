import api from '../lib/axios';

export async function getReportSummary(params = {}) {
  const response = await api.get('/reports/summary', { params });
  return response.data;
}

export async function getNoUploadReport(params = {}) {
  const response = await api.get('/reports/no-upload', { params });
  return response.data;
}

export async function getReportOverview(params = {}) {
  const response = await api.get('/dashboard/overview', { params });
  return response.data;
}

export async function getComplianceProgress(params = {}) {
  const response = await api.get('/reports/compliance-progress', { params });
  return response.data;
}

export async function getGovernanceByOffice(params = {}) {
  const response = await api.get('/reports/governance-by-office', { params });
  return response.data;
}

export async function downloadGovernanceByOffice(params = {}, format = 'csv') {
  const response = await api.get('/reports/governance-by-office', {
    params: { ...params, format },
    responseType: 'blob',
  });
  return response.data;
}

export async function getGovernanceHeatmap(params = {}) {
  const response = await api.get('/reports/governance-heatmap', { params });
  return response.data;
}

export async function downloadGovernanceHeatmap(params = {}, format = 'csv') {
  const response = await api.get('/reports/governance-heatmap', {
    params: { ...params, format },
    responseType: 'blob',
  });
  return response.data;
}

export async function downloadComplianceProgress(params = {}, format = 'csv') {
  const response = await api.get('/reports/compliance-progress/export', {
    params: { ...params, format },
    responseType: 'blob',
  });
  return response.data;
}

export async function downloadMissingUploads(params = {}, format = 'csv') {
  const response = await api.get('/reports/no-upload/export', {
    params: { ...params, format },
    responseType: 'blob',
  });
  return response.data;
}

export async function getCompletedUploads(params = {}) {
  const response = await api.get('/reports/completed-uploads', { params });
  return response.data;
}

export async function downloadCompletedUploads(params = {}, format = 'csv') {
  const response = await api.get('/reports/completed-uploads/export', {
    params: { ...params, format },
    responseType: 'blob',
  });
  return response.data;
}

export async function downloadDashboardOverview(params = {}, format = 'pdf') {
  const response = await api.get('/reports/dashboard-overview/export', {
    params: { ...params, format },
    responseType: 'blob',
  });
  return response.data;
}
