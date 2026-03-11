import { Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../hooks/use-auth";
import { logout, getMe } from "../api/auth";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { NavigationSidebar } from "../components/navigation-sidebar";
import { 
  Bell, 
  Menu,
  CheckCheck,
  CheckCircle2,
  XCircle,
  FilePen,
  FileText,
  AlertTriangle,
  Info,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useState, useCallback, useRef } from "react";
import React from "react";
import { useIdleTimer } from "../hooks/use-idle-timer";

const NOTIF_TYPE_STYLES = {
  APPROVED:            { cls: 'bg-green-100 text-green-700',   icon: CheckCircle2  },
  DENIED:              { cls: 'bg-red-100 text-red-700',       icon: XCircle       },
  REVISION_REQUESTED:  { cls: 'bg-amber-100 text-amber-700',   icon: FilePen       },
  SUBMISSION_RECEIVED: { cls: 'bg-blue-100 text-blue-700',     icon: FileText      },
  DEADLINE_REMINDER:   { cls: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  SYSTEM:              { cls: 'bg-slate-100 text-slate-700',   icon: Info          },
};

const TOPBAR_NOTIFS = [
  { id: 'n-001', type: 'APPROVED',           title: 'Submission Approved',  body: 'Annual Planning Disclosure Report has been approved.',    time: '5 Mar' },
  { id: 'n-002', type: 'REVISION_REQUESTED', title: 'Revision Requested',   body: 'Please update section 3.2 for the Signed Approval Page.', time: '4 Mar' },
  { id: 'n-003', type: 'DENIED',             title: 'Submission Denied',    body: 'Citizen Satisfaction Survey is missing Q4 data.',         time: '4 Mar' },
  { id: 'n-010', type: 'SYSTEM',             title: 'System Maintenance',   body: 'Scheduled maintenance March 15, 12 AM – 4 AM.',           time: '10 Mar' },
];

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
  const [topbarUnread, setTopbarUnread] = useState(4);

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
      "/profile": "Profile",
      "/notifications": "Notifications",
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                  <Bell className="h-4 w-4" />
                  {topbarUnread > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold leading-none">
                      {topbarUnread > 9 ? '9+' : topbarUnread}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Notifications</span>
                    {topbarUnread > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                        {topbarUnread}
                      </span>
                    )}
                  </div>
                  {topbarUnread > 0 && (
                    <button
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                      onClick={() => setTopbarUnread(0)}
                    >
                      <CheckCheck className="h-3 w-3" />
                      Mark all read
                    </button>
                  )}
                </div>
                {/* Items */}
                <div className="max-h-72 overflow-y-auto">
                  {TOPBAR_NOTIFS.map((n) => {
                    const cfg = NOTIF_TYPE_STYLES[n.type] ?? NOTIF_TYPE_STYLES.SYSTEM;
                    const NIcon = cfg.icon;
                    return (
                      <DropdownMenuItem
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                        onClick={() => navigate('/notifications')}
                      >
                        <span className={cn('shrink-0 flex items-center justify-center w-8 h-8 rounded-full', cfg.cls)}>
                          <NIcon className="w-3.5 h-3.5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-snug">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.body}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
                {/* Footer */}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 cursor-pointer text-xs font-medium text-primary"
                  onClick={() => navigate('/notifications')}
                >
                  View all notifications
                  <ArrowRight className="h-3.5 w-3.5" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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