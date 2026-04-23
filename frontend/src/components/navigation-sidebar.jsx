import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { NAV_ITEMS } from "@/lib/nav-items"
import React from "react"
import { 
  DropdownMenu,
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  ChevronDown, 
  ChevronRight,
  Home,
  ClipboardList,
  FileText,
  Users,
  Settings,
  BarChart3,
  Bell,
  Folder,
  Building2,
  MessageSquare,
  CheckSquare,
  UserCircle,
  LogOut,
  User,
  Mail,
  FileCheck,
  BarChart,
  Calendar,
} from "lucide-react"
import { useState } from "react"

// Icon mapping for navigation items
const iconMap = {
  "/dashboard": Home,
  "/governance": CheckSquare,
  "/submissions": ClipboardList,
  "/my-checklists": FileCheck,
  "/templates": FileText,
  "/users": Users,
  "/offices": Building2,
  "/years": Calendar,
  "/reports": BarChart,
  "/file-manager": Folder,
  "/audit-logs": BarChart3,
  "/notifications": Bell,
};

// Expandable sections configuration
const expandableSections = {
  "/templates": [
    { title: "All Templates", href: "/templates" },
    { title: "Manage Templates", href: "/templates/manage" },
    { title: "Manage Categories", href: "/templates/categories" }
  ],
  "/governance": [
    { title: "Manage Areas", href: "/governance/manage" },
    { title: "Compliance Matrix", href: "/governance/compliance" },
  ],
  "/files": [
    { title: "All Files", href: "/files" },
    { title: "Upload Files", href: "/files/upload" },
    { title: "File Categories", href: "/files/categories" }
  ]
};

export const NavigationSidebar = React.memo(function NavigationSidebar({ className, currentPath = "/dashboard", onNavigate, user, onLogout, ...props }) {
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Section groupings for organised sidebar
  const NAV_SECTIONS = [
    {
      label: 'Main',
      hrefs: ['/dashboard'],
    },
    {
      label: 'Compliance',
      hrefs: ['/governance', '/submissions', '/my-checklists', '/templates'],
    },
    {
      label: 'Administration',
      hrefs: ['/users', '/offices', '/years'],
    },
    {
      label: 'Reports & Logs',
      hrefs: ['/reports', '/audit-logs'],
    },
    {
      label: 'Notifications',
      hrefs: ['/notifications'],
    },
  ];

  // Filter navigation items based on user role
  const getFilteredNavItems = () => {
    if (!user?.role) return NAV_ITEMS;
    return NAV_ITEMS.filter(item =>
      item.roles.includes(user.role.toUpperCase())
    );
  };

  const filteredNavItems = getFilteredNavItems();

  const toggleExpanded = (href) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(href)) {
      newExpanded.delete(href);
    } else {
      newExpanded.add(href);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavigation = (href) => {
    if (onNavigate) {
      onNavigate(href);
    }
  };

  // Render a single nav item (shared by flat + grouped views)
  const renderNavItem = (item) => {
    const IconComponent = iconMap[item.href] || Home;
    const hasExpandableItems = expandableSections[item.href];
    return (
      <div key={item.href} className="mb-0.5">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 text-xs h-8 px-2",
            (currentPath === item.href || (hasExpandableItems && expandableSections[item.href].some(s => currentPath === s.href))) && "bg-accent text-accent-foreground",
            hasExpandableItems && "pr-1"
          )}
          onClick={() => {
            if (hasExpandableItems) {
              toggleExpanded(item.href);
            } else {
              handleNavigation(item.href);
            }
          }}
        >
          <IconComponent className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left truncate">{item.label}</span>
          {hasExpandableItems && (
            expandedItems.has(item.href)
              ? <ChevronDown className="h-3 w-3 shrink-0" />
              : <ChevronRight className="h-3 w-3 shrink-0" />
          )}
        </Button>
        {hasExpandableItems && expandedItems.has(item.href) && (
          <div className="ml-6 mt-0.5 space-y-0.5">
            {expandableSections[item.href].map((subItem) => (
              <Button
                key={subItem.href}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-xs h-7 px-2",
                  currentPath === subItem.href && "bg-accent text-accent-foreground"
                )}
                onClick={() => handleNavigation(subItem.href)}
              >
                {subItem.title}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex h-full w-64 flex-col bg-background border-r", className)} {...props}>
      {/* Header */}
      <div className="flex flex-col gap-2 p-4 border-b">
        <div className="flex items-center gap-2">
          <img
            src="/SGLG_logo%20text.png"
            alt="Seal of Good Local Governance"
            className="h-8 w-auto max-w-[140px] object-contain shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">CPDO Monitoring</h2>
            <p className="text-[10px] text-muted-foreground">v1.0.0</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2 space-y-0.5">
          {NAV_SECTIONS.map((section) => {
            const sectionItems = filteredNavItems.filter((item) =>
              section.hrefs.includes(item.href)
            );
            if (sectionItems.length === 0) return null;
            return (
              <div key={section.label} className="mb-3">
                <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                  {section.label}
                </p>
                {sectionItems.map((item) => renderNavItem(item))}
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Profile Section */}
      <div className="p-2 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-10 p-2 hover:bg-muted/50 text-xs"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0">
                  {(user?.fullName || user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {user?.fullName || user?.name || (user?.username) || (user?.email ? user.email.split('@')[0] : 'User')}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate capitalize">
                    {user?.role ? user.role.toLowerCase() : (user?.email || 'user@cpdo.gov.ph')}
                  </p>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => onNavigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});