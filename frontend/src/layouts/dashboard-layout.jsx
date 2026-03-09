import { Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../hooks/use-auth";
import { logout } from "../api/auth";
import { Button } from "../components/ui/button";
import { NavigationSidebar } from "../components/navigation-sidebar";
import { 
  Bell, 
  Menu 
} from "lucide-react";
import { useState } from "react";
import React from "react";

function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      // Force logout on client side even if server request fails
      navigate("/login", { replace: true });
    }
  };

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

  return (
    <div className="flex h-screen bg-background">
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