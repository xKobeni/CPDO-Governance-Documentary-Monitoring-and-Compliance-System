let authState = {
  user: null,
  isAuthenticated: false,
};

const listeners = new Set();

export function getAuthState() {
  return authState;
}

export function setAuthState(nextState) {
  const newState = { ...authState, ...nextState };
  // Update isAuthenticated based on user presence
  newState.isAuthenticated = !!newState.user;
  authState = newState;
  listeners.forEach((listener) => listener(authState));
}

export function subscribeAuth(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}