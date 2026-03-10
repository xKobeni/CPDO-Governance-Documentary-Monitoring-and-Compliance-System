import { Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../hooks/use-auth";
import { logout, getMe } from "../api/auth";
import { Button } from "../components/ui/button";
import { NavigationSidebar } from "../components/navigation-sidebar";
import { 
  Bell, 
  Menu 
} from "lucide-react";
import { useState, useCallback, useRef } from "react";
import React from "react";
import { useIdleTimer } from "../hooks/use-idle-timer";

// 30 minute idle timeout matching the backend; warn 5 minutes before
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARN_BEFORE_MS  =  5 * 60 * 1000;

function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [countdown, setCountdown] = useState(300); // seconds
  const countdownRef = useRef(null);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const handleIdleWarn = useCallback(() => {
    setShowIdleWarning(true);
    setCountdown(WARN_BEFORE_MS / 1000);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleIdle = useCallback(() => {
    clearInterval(countdownRef.current);
    setShowIdleWarning(false);
    handleLogout();
  }, [handleLogout]);

  const handleStayLoggedIn = useCallback(async () => {
    clearInterval(countdownRef.current);
    setShowIdleWarning(false);
    // Ping the backend to reset last_activity_at
    try { await getMe(); } catch { /* ignore */ }
  }, []);

  useIdleTimer({
    idleTimeout: IDLE_TIMEOUT_MS,
    warnBefore:  WARN_BEFORE_MS,
    onWarn: handleIdleWarn,
    onIdle: handleIdle,
  });

  const handleNavigation = (path) => {
    navigate(path);
  };

  const getCurrentPageTitle = (path) => {
    const pathTitles = {
      "/dashboard": "Dashboard",
      "/submissions": "Submissions",
      "/templates": "Templates",
      "/reports": "Reports",
      "/users": "User Management",
      "/offices": "Office Management",
      "/governance": "Governance Areas",
      "/reviews": "Reviews",
      "/audit-logs": "Audit Logs",
      "/profile": "Profile"
    };
    return pathTitles[path] || "CPDO Monitoring System";
  };

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Idle Session Warning Dialog */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-foreground mb-2">Session About to Expire</h2>
            <p className="text-sm text-muted-foreground mb-1">
              You've been inactive for a while. Your session will expire in:
            </p>
            <p className="text-3xl font-mono font-bold text-red-600 text-center my-4">
              {formatCountdown(countdown)}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Click <strong>Stay Logged In</strong> to continue your session.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleLogout}
              >
                Logout
              </Button>
              <Button
                className="flex-1"
                onClick={handleStayLoggedIn}
              >
                Stay Logged In
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-0' : 'w-64'} transition-all duration-300 overflow-hidden`}>
        <NavigationSidebar 
          currentPath={location.pathname}
          onNavigate={handleNavigation}
          className="h-full"
          user={user}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8 p-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">
              {getCurrentPageTitle(location.pathname)}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                3
              </span>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 bg-muted/20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


export default React.memo(DashboardLayout);