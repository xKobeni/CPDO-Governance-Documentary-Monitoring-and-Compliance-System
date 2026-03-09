import { useEffect, useState } from 'react';
import { getAccessToken } from '../lib/axios';
import { getMe } from '../api/auth';
import { setAuthState } from '../store/auth-store';

export default function AuthProvider({ children }) {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function initializeAuth() {
      try {
        const token = getAccessToken();
        
        if (token) {
          try {
            // Verify the token is still valid by getting user info
            const user = await getMe();
            console.log('🔐 Auth restored for user:', user.fullName, 'Role:', user.role);
            setAuthState({ user });
          } catch (error) {
            // Token is invalid/expired, clear it
            console.log('🔓 Token validation failed:', error.message);
            setAuthState({ user: null });
          }
        } else {
          // No token found, user is not authenticated
          console.log('🔓 No token found, user not authenticated');
          setAuthState({ user: null });
        }
      } catch (error) {
        console.error('🔴 Auth initialization error:', error);
        setAuthState({ user: null });
      }
      
      setIsInitializing(false);
    }

    initializeAuth();
  }, []);

  // Show loading spinner while checking authentication
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return children;
}