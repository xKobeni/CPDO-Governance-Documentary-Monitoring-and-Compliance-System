import api, { setAccessToken, clearAccessToken } from "../lib/axios";
import { setAuthState } from "../store/auth-store";

export async function login(payload) {
  const response = await api.post("/auth/login", payload);
  const { accessToken, user } = response.data;

  setAccessToken(accessToken);
  setAuthState({ user });

  return response.data;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    clearAccessToken();
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