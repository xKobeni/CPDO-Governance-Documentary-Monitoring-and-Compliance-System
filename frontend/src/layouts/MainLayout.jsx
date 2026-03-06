import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUnreadCountService } from '../services/notificationsService';
import { canAccessPage } from '../config/rbac';

export default function MainLayout({ children, currentPage, onNavigate, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    const fetchUnreadCount = async () => {
      try {
        const count = await getUnreadCountService();
        if (mounted) setUnreadNotifications(count);
      } catch {
        if (mounted) setUnreadNotifications(0);
      }
    };

    fetchUnreadCount();

    return () => {
      mounted = false;
    };
  }, [currentPage]);

  const userDisplayName = user?.fullName || 'User';
  const userRoleLabel = user?.role || 'N/A';
  const userRole = user?.role;

  const userInitials = useMemo(() => {
    const parts = userDisplayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [userDisplayName]);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'submissions',
      label: 'Submissions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      )
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'users',
      label: 'Users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      id: 'offices',
      label: 'Offices',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => canAccessPage(userRole, item.id)),
    [menuItems, userRole]
  );

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      {/* Top Bar */}
      <div className="navbar bg-base-100 border-b border-base-300 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="flex-none">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn btn-square btn-ghost"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 px-4">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <svg 
              className="w-8 h-8 text-primary" 
              viewBox="0 0 48 48" 
              fill="currentColor"
            >
              <path d="M24 4L28 14L24 18L20 14L24 4Z" />
              <path d="M14 14L24 18L20 22L10 18L14 14Z" />
              <path d="M34 14L38 18L28 22L24 18L34 14Z" />
              <rect x="20" y="18" width="8" height="4" />
            </svg>
            <div>
              <h1 className="text-lg font-bold text-base-content">CPDO Monitoring System</h1>
              <p className="text-xs text-base-content/70">City Planning and Development Office</p>
            </div>
          </div>
        </div>

        <div className="flex-none gap-8">
          {/* Notifications */}
          <button onClick={() => onNavigate('notifications')} className="btn btn-ghost btn-circle">
            <div className="indicator">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadNotifications > 0 && (
                <span className="badge badge-sm badge-error text-white font-bold indicator-item">{unreadNotifications}</span>
              )}
            </div>
          </button>

          {/* User Dropdown */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <span className="text-primary font-semibold">{userInitials}</span>
              </div>
            </div>
            <ul tabIndex={0} className="mt-3 z-1 p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-lg w-52 border border-base-300">
              <li className="menu-title">
                <span className="text-base-content">{userDisplayName}</span>
                <span className="text-xs text-base-content/70">{userRoleLabel}</span>
              </li>
              <li><a onClick={() => onNavigate('settings')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Settings</a></li>
              {canAccessPage(userRole, 'audit-logs') && (
                <li><a onClick={() => onNavigate('audit-logs')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Audit Logs</a></li>
              )}
              <div className="divider my-0"></div>
              <li><a onClick={onLogout} className="text-error"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>Logout</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-16 bottom-0 bg-base-100 border-r border-base-300 transition-all duration-300 z-40 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <nav className="p-4 space-y-1">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === item.id
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-base-content hover:bg-base-200'
              }`}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <div className="absolute bottom-4 left-4 right-4 p-4 bg-base-200 rounded-lg border border-base-300">
            <p className="text-xs text-base-content/70 mb-1">Need Help?</p>
            <a href="#support" className="text-sm text-primary hover:text-primary/80 font-medium">
              Contact Support
            </a>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main 
        className={`transition-all duration-300 pt-16 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
