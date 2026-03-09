// Utility function to help debug authentication issues
export function debugAuth() {
  const hasToken = !!localStorage.getItem('accessToken');
  const tokenValue = localStorage.getItem('accessToken');
  const hasRememberMe = localStorage.getItem('rememberMe') === 'true';
  const rememberedEmail = localStorage.getItem('rememberedEmail');
  
  // Get auth state from store
  const { getAuthState } = require('../store/auth-store');
  const authState = getAuthState();
  
  console.log('🔧 Authentication Debug Info:');
  console.log('- Has Access Token:', hasToken);
  console.log('- Token Preview:', tokenValue ? `${tokenValue.substring(0, 20)}...` : 'null');
  console.log('- Remember Me Enabled:', hasRememberMe);
  console.log('- Remembered Email:', rememberedEmail);
  console.log('- Current URL:', window.location.href);
  console.log('- Auth State:', authState);
  console.log('- User Object:', authState.user);
  console.log('- User Role:', authState.user?.role);
  console.log('- User Full Name:', authState.user?.fullName);
  console.log('- Is Authenticated:', authState.isAuthenticated);
  
  return {
    hasToken,
    tokenPreview: tokenValue ? `${tokenValue.substring(0, 20)}...` : null,
    hasRememberMe,
    rememberedEmail,
    currentUrl: window.location.href,
    authState,
    user: authState.user,
    userRole: authState.user?.role,
    userFullName: authState.user?.fullName,
    isAuthenticated: authState.isAuthenticated
  };
}

// Call this in browser console to debug: window.debugAuth()
if (typeof window !== 'undefined') {
  window.debugAuth = debugAuth;
}