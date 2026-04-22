import api from '../lib/axios';

// User Management API calls
export async function getUsers(params = {}) {
  const response = await api.get('/users', { params });
  return response.data;
}

export async function getUser(userId) {
  const response = await api.get(`/users/${userId}`);
  return response.data;
}

export async function createUser(userData) {
  // Transform frontend format to backend format
  const backendData = {
    email: userData.email,
    fullName: userData.fullName,
    roleCode: userData.role,
    officeId: userData.officeId || null,
  };
  // Only include password if provided; backend will auto-generate if absent
  if (userData.password) {
    backendData.password = userData.password;
  }
  const response = await api.post('/users', backendData);
  return response.data;
}

// Note: Now implemented - backend has update user endpoint
export async function updateUser(userId, userData) {
  // Transform frontend format to backend format
  const backendData = {
    email: userData.email,
    fullName: userData.fullName,
    roleCode: userData.role,
    officeId: userData.officeId || null
  };
  const response = await api.patch(`/users/${userId}`, backendData);
  return response.data;
}

// Note: Now implemented - backend has delete user endpoint  
export async function deleteUser(userId) {
  await api.delete(`/users/${userId}`);
}

export async function setUserActive(userId, isActive) {
  const response = await api.patch(`/users/${userId}/active`, { isActive });
  return response.data;
}

export async function resetUserPassword(userId) {
  const response = await api.post(`/users/${userId}/reset-password`);
  return response.data;
}

export async function resendUserVerification(userId) {
  const response = await api.post(`/users/${userId}/resend-verification`);
  return response.data;
}

export async function getOffices() {
  const response = await api.get('/offices');
  return response.data;
}

// Note: Backend doesn't have user stats endpoint yet, this is placeholder
export async function getUserStats() {
  const response = await api.get('/analytics/user-stats');
  return response.data;
}
