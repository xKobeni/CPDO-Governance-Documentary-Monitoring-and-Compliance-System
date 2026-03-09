let authState = {
  user: null,
};

const listeners = new Set();

export function getAuthState() {
  return authState;
}

export function setAuthState(nextState) {
  authState = { ...authState, ...nextState };
  listeners.forEach((listener) => listener(authState));
}

export function subscribeAuth(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}