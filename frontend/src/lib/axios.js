import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

let accessToken = localStorage.getItem("accessToken");
let sessionId = localStorage.getItem("sessionId");

export function setAccessToken(token) {
  accessToken = token;
  if (token) {
    localStorage.setItem("accessToken", token);
  } else {
    localStorage.removeItem("accessToken");
  }
}

export function clearAccessToken() {
  accessToken = null;
  localStorage.removeItem("accessToken");
}

export function getAccessToken() {
  return accessToken;
}

export function setSessionId(id) {
  sessionId = id;
  if (id) {
    localStorage.setItem("sessionId", id);
  } else {
    localStorage.removeItem("sessionId");
  }
}

export function clearSessionId() {
  sessionId = null;
  localStorage.removeItem("sessionId");
}

export function getSessionId() {
  return sessionId;
}

async function forceLogout({ showTimeoutAlert = false } = {}) {
  clearAccessToken();
  clearSessionId();
  const { setAuthState } = await import("../store/auth-store");
  setAuthState({ user: null });

  if (showTimeoutAlert) {
    // Basic notification so users know it was a timeout, not an error
    window.alert("Your session has expired due to inactivity. Please log in again.");
  }

  window.location.href = "/login";
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (sessionId) {
    config.headers["x-session-id"] = sessionId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message ?? "";

    // If backend reports explicit inactivity timeout, treat it as a timeout and notify user
    if (
      status === 401 &&
      typeof message === "string" &&
      message.toLowerCase().includes("session inactive")
    ) {
      await forceLogout({ showTimeoutAlert: true });
      return Promise.reject(error);
    }

    if (
      status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = refreshResponse.data?.accessToken;
        const newSessionId = refreshResponse.data?.sessionId;
        setAccessToken(newToken);
        if (newSessionId) setSessionId(newSessionId);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        if (newSessionId) originalRequest.headers["x-session-id"] = newSessionId;
        return api(originalRequest);
      } catch (refreshError) {
        await forceLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;