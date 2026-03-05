// QUICK_START_GUIDE.md
# Frontend Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ installed
- Backend running on `http://localhost:5000` (or update `.env`)

### Installation
```bash
cd frontend
npm install
```

### Environment Setup
Create `.env` file (already exists):
```
VITE_API_URL=http://localhost:5000/api
```

### Start Development Server
```bash
npm run dev
```

Access at: `http://localhost:5173`

## 📱 Login Flow

### Test Credentials
Once you create a user in the backend:
```
Email: user@example.com
Password: password123
```

### What Happens on Login
1. Frontend sends `POST /api/auth/login`
2. Backend returns `accessToken` and `refreshToken`
3. Tokens stored in localStorage
4. User data stored in Zustand state
5. Redirected to Dashboard

## 🔐 Authentication Usage

### Use Auth Hook in Any Component
```javascript
import { useAuth } from '../hooks/useAuth';

export function MyComponent() {
  const { user, isAuthenticated, isLoading, error, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }
  
  return (
    <div>
      Welcome, {user.fullName}!
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Available Actions
```javascript
const {
  user,              // Current user object
  isAuthenticated,   // Boolean
  isLoading,         // Boolean - during login/logout
  error,             // Error message string or null
  
  initializeAuth,    // Initialize from localStorage
  login,             // async (email, password)
  logout,            // async ()
  clearError,        // Clear error message
  forceLogout        // Emergency logout
} = useAuth();
```

## 🌐 Making API Calls

### Common Pattern
```javascript
import api from '../config/api';
import { API_ENDPOINTS } from '../config/constants';
import { getErrorMessage } from '../utils/apiErrorHandler';

// GET Request
try {
  const response = await api.get(API_ENDPOINTS.USERS.LIST);
  console.log(response.data);
} catch (error) {
  console.error(getErrorMessage(error));
}

// POST Request
try {
  const response = await api.post(
    API_ENDPOINTS.SUBMISSIONS.CREATE,
    {
      title: 'New Submission',
      governance_area_id: 'GA01'
    }
  );
} catch (error) {
  console.error(getErrorMessage(error));
}

// PUT Request
try {
  const response = await api.put(
    API_ENDPOINTS.USERS.UPDATE('user-id-here'),
    { fullName: 'New Name' }
  );
} catch (error) {
  console.error(getErrorMessage(error));
}

// DELETE Request
try {
  await api.delete(API_ENDPOINTS.USERS.DELETE('user-id'));
} catch (error) {
  console.error(getErrorMessage(error));
}
```

## 📚 Available Endpoints

### Users
```javascript
API_ENDPOINTS.USERS.LIST                    // GET /users
API_ENDPOINTS.USERS.GET(id)                 // GET /users/:id
API_ENDPOINTS.USERS.CREATE                  // POST /users
API_ENDPOINTS.USERS.UPDATE(id)              // PUT /users/:id
API_ENDPOINTS.USERS.DELETE(id)              // DELETE /users/:id
API_ENDPOINTS.USERS.SET_ACTIVE(id)          // PUT /users/:id/set-active
```

### Submissions
```javascript
API_ENDPOINTS.SUBMISSIONS.LIST              // GET /submissions
API_ENDPOINTS.SUBMISSIONS.GET(id)           // GET /submissions/:id
API_ENDPOINTS.SUBMISSIONS.CREATE            // POST /submissions
API_ENDPOINTS.SUBMISSIONS.UPDATE(id)        // PUT /submissions/:id
API_ENDPOINTS.SUBMISSIONS.REVIEW(id)        // PUT /submissions/:id/review
```

### Templates
```javascript
API_ENDPOINTS.TEMPLATES.LIST                // GET /templates
API_ENDPOINTS.TEMPLATES.GET(id)             // GET /templates/:id
API_ENDPOINTS.TEMPLATES.CREATE              // POST /templates
API_ENDPOINTS.TEMPLATES.UPDATE(id)          // PUT /templates/:id
API_ENDPOINTS.TEMPLATES.DELETE(id)          // DELETE /templates/:id
```

### Reports
```javascript
API_ENDPOINTS.REPORTS.LIST                  // GET /reports
API_ENDPOINTS.REPORTS.GET(id)               // GET /reports/:id
API_ENDPOINTS.REPORTS.EXPORT(format)        // GET /reports/export?format=pdf|excel
```

### Notifications
```javascript
API_ENDPOINTS.NOTIFICATIONS.LIST            // GET /notifications
API_ENDPOINTS.NOTIFICATIONS.COUNT           // GET /notifications/count
API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(id) // PUT /notifications/:id/read
```

### Audit Logs
```javascript
API_ENDPOINTS.AUDIT_LOGS.LIST               // GET /audit-logs
```

## 🎨 UI Components Available

### Pages
- `Login` - Authentication page
- `ForgotPassword` - Password reset
- `Dashboard` - Main dashboard with stats
- `Submissions` - Submission list/details
- `Templates` - Template management
- `Reports` - Report generation
- `Users` - User management
- `Settings` - User settings
- `Notifications` - Notification center
- `AuditLogs` - System audit trail
- `Error pages` (404, 500, Network)

### Navigation
- `MainLayout` - Wraps all authenticated pages
- Sidebar with menu items
- Top bar with notifications and user dropdown

## 🔧 Error Handling

### Get User-Friendly Error Messages
```javascript
import { getErrorMessage, formatApiError } from '../utils/apiErrorHandler';

try {
  await api.post(endpoint, data);
} catch (error) {
  // Simple message
  const message = getErrorMessage(error);
  toast.error(message);
  
  // With detailed info
  const { message, fieldErrors, isNetwork, isAuth } = formatApiError(error);
  
  if (isNetwork) {
    toast.error('Network error. Please check your connection.');
  } else if (isAuth) {
    // Automatically handled - user redirected to login
  } else if (fieldErrors) {
    // Set form errors
    setErrors(fieldErrors);
  }
}
```

## 📦 Project Structure

```
src/
├── pages/              # Page components
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   └── ...
├── layouts/            # Layout wrappers
│   └── MainLayout.jsx
├── components/         # Reusable UI components
├── config/             # Configuration
│   ├── api.js         # Axios setup
│   └── constants.js   # API endpoints
├── services/           # API service functions
│   └── authService.js
├── store/              # State management
│   └── authStore.js   # Zustand auth store
├── hooks/              # Custom hooks
│   └── useAuth.js
├── utils/              # Utilities
│   └── apiErrorHandler.js
├── routes/             # Route definitions (if using router)
└── App.jsx             # Main app component
```

## 🧪 Development Tips

### 1. Check Token in DevTools
```javascript
// In browser console:
localStorage.getItem('cpdo_access_token')
localStorage.getItem('cpdo_user')
JSON.parse(localStorage.getItem('cpdo_user'))
```

### 2. Clear Auth for Testing
```javascript
// In browser console:
localStorage.clear()
window.location.reload()
```

### 3. Enable Request Logging
Add to `config/api.js` before export:
```javascript
if (import.meta.env.DEV) {
  api.interceptors.request.use((config) => {
    console.log('API Request:', config.method.toUpperCase(), config.url);
    return config;
  });
}
```

### 4. Test Token Refresh
- Login and wait for access token to expire
- Make an API request - should automatically refresh
- Check localStorage for new token

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

Creates optimized `dist/` folder.

### Environment for Production
Update `.env` with production backend URL:
```
VITE_API_URL=https://api.yourdomain.com/api
```

## 📖 File Guide

**Read These First:**
1. `AUTH_BACKEND_INTEGRATION.md` - Complete architecture
2. `QUICK_START_GUIDE.md` - This file

**Check These for Details:**
- `src/config/constants.js` - All endpoints
- `src/services/authService.js` - Auth functions
- `src/store/authStore.js` - State management
- `src/utils/apiErrorHandler.js` - Error handling

**View These for Examples:**
- `src/pages/Login.jsx` - Login implementation
- `src/pages/Dashboard.jsx` - API usage example
- `src/App.jsx` - Auth initialization

## 🆘 Common Issues

### "Network Error" on Login
- Check if backend is running on correct port
- Verify `.env` VITE_API_URL is correct
- Check CORS configuration on backend

### "Invalid Token" After Refresh
- Backend refresh endpoint returns wrong format
- Expected: `{ accessToken, refreshToken }`
- Check backend token expiration times

### Stuck on Loading Screen
- Check browser console for errors
- Verify `initializeAuth()` completes
- Check localStorage for corrupted data

### Lost Login on Page Refresh
- Auth state is correctly restored from localStorage
- Check if localStorage is enabled
- Check if browser allows localStorage access

## 📝 Next Steps

1. ✅ Frontend setup complete
2. ⏳ Implement backend authentication endpoints
3. ⏳ Create test user account
4. ⏳ Test login flow end-to-end
5. ⏳ Implement remaining feature pages
6. ⏳ Add form validation with Zod
7. ⏳ Add toast notifications with react-hot-toast
8. ⏳ Implement data fetching with React Query

---

**Need Help?** Check the error output in browser console first, then review the relevant file in the guide.
