// AUTH_BACKEND_INTEGRATION.md
# Frontend Authentication & Backend Integration Guide

## 🏗️ Architecture Overview

The frontend now has a complete, organized authentication system with proper separation of concerns:

```
src/
├── config/
│   ├── api.js           # Axios instance with interceptors
│   └── constants.js     # API endpoints & configuration
├── services/
│   └── authService.js   # Authentication API calls
├── store/
│   └── authStore.js     # Zustand auth state management
├── hooks/
│   └── useAuth.js       # Custom hook for using auth
├── utils/
│   └── apiErrorHandler.js # Error handling utilities
└── pages/
    └── Login.jsx        # Login page with backend integration
```

## 📋 Installed Libraries

Your frontend has these excellent libraries installed:

```json
{
  "react": "^19.2.0",                 // UI Framework
  "react-dom": "^19.2.0",             // React DOM
  "zustand": "^5.0.11",               // State Management
  "axios": "^1.13.6",                 // HTTP Client
  "axios-retry": "^4.5.0",            // Automatic retry logic
  "react-hook-form": "^7.71.2",       // Form handling
  "zod": "^4.3.6",                    // Schema validation
  "react-hot-toast": "^2.6.0",        // Toast notifications
  "@tanstack/react-query": "^5.90.21",// Data fetching & caching
  "js-cookie": "^3.0.5"               // Cookie management
}
```

## 🔑 Authentication Flow

### 1. **Login Request**
```javascript
// Login.jsx sends credentials to backend
await login(email, password)
```

**Backend API:**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "STAFF",
    "office": "Planning Division"
  }
}
```

### 2. **Token Storage**
Tokens are stored in localStorage:
```javascript
localStorage.setItem('cpdo_access_token', accessToken);
localStorage.setItem('cpdo_refresh_token', refreshToken);
localStorage.setItem('cpdo_user', JSON.stringify(user));
```

### 3. **Request Interceptor**
Every API request automatically includes the access token:
```javascript
// config/api.js - Request Interceptor
headers.Authorization = `Bearer ${accessToken}`
```

### 4. **Token Refresh (Automatic)**
When token expires (401 response):
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}
```

**Response:**
```json
{
  "accessToken": "new_token",
  "refreshToken": "new_refresh_token"
}
```

The request is automatically retried with the new token.

### 5. **Logout**
```javascript
await logout()  // Clears tokens and user data
```

**Backend API:**
```
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

## 📂 File Descriptions

### `config/constants.js`
Central configuration for all API endpoints and settings.

**API Endpoints defined:**
- `AUTH.LOGIN` - POST /auth/login
- `AUTH.LOGOUT` - POST /auth/logout
- `AUTH.REFRESH` - POST /auth/refresh
- `AUTH.ME` - GET /auth/me
- `AUTH.FORGOT_PASSWORD` - POST /auth/forgot-password
- `AUTH.RESET_PASSWORD` - POST /auth/reset-password
- And all other endpoints (Users, Submissions, Templates, Reports, etc.)

**Storage Keys:**
- `cpdo_access_token`
- `cpdo_refresh_token`
- `cpdo_user`
- `cpdo-theme`

### `config/api.js`
Axios instance with intelligent interceptors:

**Request Interceptor:**
- Automatically adds Bearer token to Authorization header
- Called before every request

**Response Interceptor:**
- Catches 401 errors
- Automatically refreshes token if available
- Retries the original request
- Clears auth if refresh fails
- Dispatches logout event

**Retry Logic:**
- Automatic exponential backoff on network errors
- Configurable via `axiosRetry`
- 3 retries by default for network issues

### `services/authService.js`
Low-level API communication functions:

```javascript
loginService(email, password)           // Login
logoutService()                         // Logout
getMeService()                          // Get current user
forgotPasswordService(email)            // Request password reset
resetPasswordService(token, pwd, conf)  // Reset password
refreshTokenService(refreshToken)       // Refresh access token
isAuthenticated()                       // Check if logged in
getStoredUser()                         // Get user from localStorage
getStoredToken()                        // Get access token
```

### `store/authStore.js`
Zustand store for global auth state:

```javascript
// State
user              // Current user object
isAuthenticated   // Boolean - logged in?
isLoading         // Boolean - request in progress?
error             // String - last error message

// Actions
initializeAuth()  // Load auth from localStorage on app start
login(email, pwd) // Login with credentials
logout()          // Logout user
clearError()      // Clear error message
forceLogout()     // Emergency logout (from interceptor)
```

**Usage:**
```javascript
const { user, isAuthenticated, isLoading, error } = useAuth();
```

### `utils/apiErrorHandler.js`
Error parsing and formatting utilities:

```javascript
getErrorMessage(error)      // Extract user-friendly error message
getFieldErrors(error)       // Get field-specific validation errors
isNetworkError(error)       // Check if network issue
isAuthError(error)          // Check if auth error (401)
isPermissionError(error)    // Check if permission error (403)
isValidationError(error)    // Check if validation error (400)
formatApiError(error)       // Format entire error object with all flags
```

## 🔐 Backend Requirements

Your backend must implement these endpoints:

### Authentication Endpoints

**1. Login**
```
POST /api/auth/login
Content-Type: application/json

Request:
{
  "email": string,
  "password": string
}

Response (200):
{
  "accessToken": string,
  "refreshToken": string,
  "user": {
    "id": string,
    "email": string,
    "fullName": string,
    "role": "ADMIN" | "STAFF" | "OFFICE",
    "office": string,
    ...other fields
  }
}

Response (401):
{
  "message": "Invalid credentials"
}

Response (400):
{
  "message": "Email and password are required",
  "errors": {
    "email": ["Invalid email format"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

**2. Refresh Token**
```
POST /api/auth/refresh
Content-Type: application/json

Request:
{
  "refreshToken": string
}

Response (200):
{
  "accessToken": string,
  "refreshToken": string (optional, new if rotated)
}

Response (401):
{
  "message": "Invalid or expired refresh token"
}
```

**3. Get Current User**
```
GET /api/auth/me
Authorization: Bearer {accessToken}

Response (200):
{
  "id": string,
  "email": string,
  "fullName": string,
  "role": "ADMIN" | "STAFF" | "OFFICE",
  "office": string,
  ...other fields
}

Response (401):
{
  "message": "Unauthorized"
}
```

**4. Logout**
```
POST /api/auth/logout
Authorization: Bearer {accessToken}

Response (200):
{
  "message": "Logged out successfully"
}
```

**5. Forgot Password**
```
POST /api/auth/forgot-password
Content-Type: application/json

Request:
{
  "email": string
}

Response (200):
{
  "message": "Password reset email sent"
}
```

**6. Reset Password**
```
POST /api/auth/reset-password
Content-Type: application/json

Request:
{
  "token": string,
  "password": string,
  "passwordConfirm": string
}

Response (200):
{
  "message": "Password reset successful"
}

Response (400):
{
  "message": "Invalid or expired token"
}
```

## 🎯 Configuration

**.env file:**
```
VITE_API_URL=http://localhost:5000/api
```

This is used in `config/api.js` to create the axios baseURL.

## 💡 Usage Examples

### In Components

**Login Page:**
```javascript
import { useAuth } from '../hooks/useAuth';

function LoginPage() {
  const { login, isLoading, error } = useAuth();
  
  const handleLogin = async (email, password) => {
    try {
      await login(email, password);
      // Redirect to dashboard
    } catch (error) {
      // Error is in `error` state
    }
  };
}
```

**Logout:**
```javascript
const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  // Redirect to login
};
```

**Check Authentication:**
```javascript
const { isAuthenticated, user } = useAuth();

if (!isAuthenticated) {
  return <Login />;
}

return <Dashboard user={user} />;
```

### Making API Requests

```javascript
// Using the configured axios instance
import api from '../config/api';
import { API_ENDPOINTS } from '../config/constants';

// Get all users
const response = await api.get(API_ENDPOINTS.USERS.LIST);

// Create submission
const response = await api.post(
  API_ENDPOINTS.SUBMISSIONS.CREATE,
  { title: 'New Submission', ... }
);

// Update user
const response = await api.put(
  API_ENDPOINTS.USERS.UPDATE('user-id'),
  { fullName: 'New Name', ... }
);
```

### Error Handling

```javascript
import { formatApiError } from '../utils/apiErrorHandler';

try {
  await some_api_call();
} catch (error) {
  const formattedError = formatApiError(error);
  
  // Checks available:
  // - formattedError.message (user-friendly error)
  // - formattedError.isNetwork (network issue)
  // - formattedError.isAuth (401 - needs login)
  // - formattedError.isPermission (403 - no access)
  // - formattedError.isValidation (400 - bad input)
  // - formattedError.fieldErrors (validation by field)
  
  if (formattedError.isValidation) {
    // Show field errors in form
    setFieldErrors(formattedError.fieldErrors);
  }
}
```

## 🔄 App Initialization Flow

1. **App starts** → `useAuth().initializeAuth()` called
2. **Check localStorage** → Load stored tokens and user
3. **Show loading screen** → Until auth initialization complete
4. **Check isAuthenticated** → Route to Login or Dashboard
5. **User logs in** → Tokens stored, redirected to Dashboard
6. **API requests** → Automatically include Bearer token
7. **Token expires** → Automatically refresh with refresh token
8. **User logs out** → Clear all storage, show Login page

## 🚀 Next Steps

1. **Implement Backend**
   - Create the authentication endpoints listed above
   - Implement JWT token generation (access + refresh)
   - Add token validation middleware
   - Test all endpoints thoroughly

2. **Update Environment**
   - Ensure VITE_API_URL points to your backend

3. **Add More Endpoints**
   - All other API endpoints follow the same pattern
   - Use `api` from config/api.js
   - Use `API_ENDPOINTS` from config/constants.js

4. **Handle Edge Cases**
   - Network disconnection
   - Token expiration
   - Concurrent requests
   - Page refresh with old token

## 🧪 Testing Login

Once backend is ready:

1. Start backend on `http://localhost:5000`
2. Create a test user account
3. Use credentials to login from frontend
4. Check browser DevTools → Application → localStorage
5. Verify tokens are stored
6. Make API calls to test interceptors

## 📝 Notes

- **Token Storage**: Using localStorage for now (suitable for SPAs)
- **HTTPS Recommended**: In production, use HTTPS with flags: `secure`, `httpOnly`, `sameSite`
- **CORS**: Backend must allow frontend origin
- **Token Expiration**: Access token should be short-lived (15-30 mins)
- **Refresh Token**: Should be long-lived (7-30 days)
- **Rate Limiting**: Implement on backend (especially login endpoint)

## 🐛 Debugging

Enable logging in interceptors:

```javascript
// In config/api.js, add console logs:
api.interceptors.request.use((config) => {
  console.log('Request:', config.url, config.data);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);
```

---

**Setup by:** GitHub Copilot
**Date:** March 5, 2026
**Status:** Ready for Backend Integration
