import api, { setAccessToken, clearAccessToken, setSessionId, clearSessionId } from "../lib/axios";
import { setAuthState } from "../store/auth-store";

export async function login(payload) {
  const response = await api.post("/auth/login", payload);
  const { accessToken, sessionId, user } = response.data;

  setAccessToken(accessToken);
  if (sessionId) setSessionId(sessionId);
  setAuthState({ user });

  return response.data;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    clearAccessToken();
    clearSessionId();
    setAuthState({ user: null });
  }
}

export async function getMe() {
  const response = await api.get("/auth/me");
  // Extract user from the response since backend returns { user: {...} }
  return response.data.user;
}

export async function updateMe(payload) {
  const response = await api.patch("/auth/me", payload);
  return response.data.user;
}

export async function requestPasswordReset(email) {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
}

export async function resetPassword(token, newPassword) {
  const response = await api.post("/auth/reset-password", { token, newPassword });
  return response.data;
}