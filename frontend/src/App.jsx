import { useEffect, useState } from 'react';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';
import Notifications from './pages/Notifications';
import MainLayout from './layouts/MainLayout';
import { Error404 } from './pages/ErrorPage';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authInitialized, setAuthInitialized] = useState(false);
  const { isAuthenticated, initializeAuth, logout } = useAuth();

  // Initialize auth from localStorage on app load
  useEffect(() => {
    initializeAuth().finally(() => {
      setAuthInitialized(true);
    });
  }, [initializeAuth]);

  // Handle navigation between pages
  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  // Handle logout
  const handleLogout = () => {
    logout().then(() => {
      setCurrentPage('login');
    });
  };

  // Show loading while initializing auth
  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="loading loading-spinner loading-lg text-violet-600"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login/forgot password pages
  if (!isAuthenticated) {
    if (currentPage === 'forgot-password') {
      return <ForgotPassword onBackToLogin={() => setCurrentPage('login')} />;
    }
    return <Login onLogin={() => setCurrentPage('dashboard')} onForgotPassword={() => setCurrentPage('forgot-password')} />;
  }

  // Render page content based on current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'submissions':
        return <Error404 message="Submissions page coming soon" />;
      case 'templates':
        return <Error404 message="Templates page coming soon" />;
      case 'reports':
        return <Error404 message="Reports page coming soon" />;
      case 'users':
        return <Error404 message="Users page coming soon" />;
      case 'settings':
        return <Settings />;
      case 'notifications':
        return <Notifications />;
      case 'audit-logs':
        return <AuditLogs />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <MainLayout 
      currentPage={currentPage} 
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      {renderPage()}
    </MainLayout>
  );
}