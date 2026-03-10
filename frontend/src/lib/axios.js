import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

let accessToken = localStorage.getItem('accessToken');
let sessionId = localStorage.getItem('sessionId');

export function setAccessToken(token) {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

export function clearAccessToken() {
  accessToken = null;
  localStorage.removeItem('accessToken');
}

export function getAccessToken() {
  return accessToken;
}

export function setSessionId(id) {
  sessionId = id;
  if (id) {
    localStorage.setItem('sessionId', id);
  } else {
    localStorage.removeItem('sessionId');
  }
}

export function clearSessionId() {
  sessionId = null;
  localStorage.removeItem('sessionId');
}

export function getSessionId() {
  return sessionId;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (sessionId) {
    config.headers['x-session-id'] = sessionId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
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
        if (newSessionId) originalRequest.headers['x-session-id'] = newSessionId;
        return api(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        clearSessionId();
        // Import setAuthState here to avoid circular dependency
        const { setAuthState } = await import('../store/auth-store');
        setAuthState({ user: null });
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;