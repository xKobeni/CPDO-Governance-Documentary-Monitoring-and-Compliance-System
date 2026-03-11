import React, { useState, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  FilePen,
  FileText,
  AlertTriangle,
  Info,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  Inbox,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS = [
  {
    id: 'n-001',
    type: 'APPROVED',
    title: 'Submission Approved',
    body: 'Your submission for "Annual Planning Disclosure Report" under Basic Compliance has been approved.',
    relatedTo: 'Annual Planning Disclosure Report',
    submissionId: 'sub-001',
    isRead: false,
    createdAt: '2026-03-05T10:00:00Z',
    actor: 'Admin User',
  },
  {
    id: 'n-002',
    type: 'REVISION_REQUESTED',
    title: 'Revision Requested',
    body: 'Please attach the signed version and update section 3.2 for "Signed Approval Page".',
    relatedTo: 'Signed Approval Page',
    submissionId: 'sub-002',
    isRead: false,
    createdAt: '2026-03-04T09:40:00Z',
    actor: 'Admin User',
  },
  {
    id: 'n-003',
    type: 'DENIED',
    title: 'Submission Denied',
    body: 'Your submission for "Citizen Satisfaction Survey Results" was denied. Missing Q4 data. Please resubmit a complete document.',
    relatedTo: 'Citizen Satisfaction Survey Results',
    submissionId: 'sub-003',
    isRead: false,
    createdAt: '2026-03-04T09:00:00Z',
    actor: 'Admin User',
  },
  {
    id: 'n-004',
    type: 'SUBMISSION_RECEIVED',
    title: 'Submission Received',
    body: 'A new submission for "Budget Utilization Statement" from City Planning Office has been queued for review.',
    relatedTo: 'Budget Utilization Statement',
    submissionId: 'sub-005',
    isRead: false,
    createdAt: '2026-03-03T12:14:00Z',
    actor: 'Ana Gonzales',
  },
  {
    id: 'n-005',
    type: 'DEADLINE_REMINDER',
    title: 'Deadline Reminder',
    body: 'Financial Stewardship submissions are due in 3 days (March 14, 2026). 2 of 5 items are still pending.',
    relatedTo: 'Financial Stewardship',
    submissionId: null,
    isRead: true,
    createdAt: '2026-03-11T08:00:00Z',
    actor: 'System',
  },
  {
    id: 'n-006',
    type: 'APPROVED',
    title: 'Submission Approved',
    body: 'Your submission for "Budget Utilization Statement" has been verified and approved.',
    relatedTo: 'Budget Utilization Statement',
    submissionId: 'sub-005',
    isRead: true,
    createdAt: '2026-03-04T08:00:00Z',
    actor: 'Admin User',
  },
  {
    id: 'n-007',
    type: 'SUBMISSION_RECEIVED',
    title: 'Submission Received',
    body: 'New submission for "Service Delivery Report" from Region IV-A Office received and pending review.',
    relatedTo: 'Service Delivery Report',
    submissionId: 'sub-008',
    isRead: true,
    createdAt: '2026-03-01T10:00:00Z',
    actor: 'Lina Torres',
  },
  {
    id: 'n-008',
    type: 'REVISION_REQUESTED',
    title: 'Revision Requested',
    body: 'The "Citizen Feedback Mechanism Report" is missing the resolution column in the feedback log. Please update and resubmit.',
    relatedTo: 'Citizen Feedback Mechanism Report',
    submissionId: 'sub-009',
    isRead: true,
    createdAt: '2026-03-03T09:30:00Z',
    actor: 'Admin User',
  },
  {
    id: 'n-009',
    type: 'APPROVED',
    title: 'Submission Approved',
    body: 'Your "ARTA Compliance Certificate" has been reviewed and approved.',
    relatedTo: 'ARTA Compliance Certificate',
    submissionId: 'sub-010',
    isRead: true,
    createdAt: '2026-03-01T08:00:00Z',
    actor: 'Admin User',
  },
  {
    id: 'n-010',
    type: 'SYSTEM',
    title: 'System Maintenance',
    body: 'Scheduled system maintenance on March 15, 2026 from 12:00 AM to 4:00 AM. The platform will be temporarily unavailable.',
    relatedTo: null,
    submissionId: null,
    isRead: false,
    createdAt: '2026-03-10T09:00:00Z',
    actor: 'System',
  },
  {
    id: 'n-011',
    type: 'SUBMISSION_RECEIVED',
    title: 'Submission Received',
    body: '"Procurement Summary" submitted by Budget & Finance Office is now queued for review.',
    relatedTo: 'Procurement Summary',
    submissionId: 'sub-007',
    isRead: true,
    createdAt: '2026-03-06T07:30:00Z',
    actor: 'Carlo Mendoza',
  },
  {
    id: 'n-012',
    type: 'DENIED',
    title: 'Submission Denied',
    body: 'Your "Client Satisfaction Index" submission was denied. The CSI computation formula is incorrect. Please recompute and resubmit.',
    relatedTo: 'Client Satisfaction Index',
    submissionId: 'sub-012',
    isRead: true,
    createdAt: '2026-03-05T08:30:00Z',
    actor: 'Admin User',
  },
  {
    id: 'n-013',
    type: 'DEADLINE_REMINDER',
    title: 'Deadline Reminder',
    body: 'Basic Compliance submissions are due in 7 days (March 18, 2026). 1 item requires revision.',
    relatedTo: 'Basic Compliance',
    submissionId: null,
    isRead: true,
    createdAt: '2026-03-11T08:00:00Z',
    actor: 'System',
  },
  {
    id: 'n-014',
    type: 'SYSTEM',
    title: 'New Governance Area Added',
    body: 'A new governance area "Digital Governance & ICT" has been added to the compliance matrix. Review the new checklist items.',
    relatedTo: 'Digital Governance & ICT',
    submissionId: null,
    isRead: true,
    createdAt: '2026-03-08T10:00:00Z',
    actor: 'System',
  },
  {
    id: 'n-015',
    type: 'SUBMISSION_RECEIVED',
    title: 'Submission Received',
    body: '"Public Information Material" from Environment & Natural Resources Office is now pending review.',
    relatedTo: 'Public Information Material',
    submissionId: 'sub-011',
    isRead: true,
    createdAt: '2026-03-06T08:00:00Z',
    actor: 'Roel Bautista',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle2,
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    iconClass: 'text-green-600',
    dotClass: 'bg-green-500',
  },
  DENIED: {
    label: 'Denied',
    icon: XCircle,
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    iconClass: 'text-red-500',
    dotClass: 'bg-red-500',
  },
  REVISION_REQUESTED: {
    label: 'Revision Requested',
    icon: FilePen,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    iconClass: 'text-amber-500',
    dotClass: 'bg-amber-500',
  },
  SUBMISSION_RECEIVED: {
    label: 'Submission Received',
    icon: FileText,
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    iconClass: 'text-blue-500',
    dotClass: 'bg-blue-500',
  },
  DEADLINE_REMINDER: {
    label: 'Deadline Reminder',
    icon: AlertTriangle,
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    iconClass: 'text-orange-500',
    dotClass: 'bg-orange-400',
  },
  SYSTEM: {
    label: 'System',
    icon: Info,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    iconClass: 'text-slate-500',
    dotClass: 'bg-slate-400',
  },
};

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ALL_TYPES = Object.keys(TYPE_CONFIG);

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION DETAIL DIALOG
// ─────────────────────────────────────────────────────────────────────────────
function NotificationDetailDialog({ notification, open, onClose }) {
  if (!notification) return null;
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.SYSTEM;
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className={cn('flex items-center justify-center w-9 h-9 rounded-full', config.badgeClass)}>
              <Icon className="w-5 h-5" />
            </span>
            <DialogTitle className="text-base leading-tight">{notification.title}</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1">
              <p className="text-sm text-foreground leading-relaxed">{notification.body}</p>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground border-t pt-3">
                <div>
                  <span className="font-medium text-foreground">Type</span>
                  <p>
                    <Badge variant="outline" className={cn('text-xs mt-0.5', config.badgeClass)}>
                      {config.label}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="font-medium text-foreground">From</span>
                  <p className="mt-0.5">{notification.actor}</p>
                </div>
                {notification.relatedTo && (
                  <div className="col-span-2">
                    <span className="font-medium text-foreground">Related To</span>
                    <p className="mt-0.5">{notification.relatedTo}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="font-medium text-foreground">Received</span>
                  <p className="mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>
              </div>

              {notification.submissionId && (
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs mt-1">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Submission
                </Button>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

// ─── NOTIFICATIONS PAGE ──────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount   = notifications.filter(n =>  n.isRead).length;
  const typeCounts  = useMemo(() =>
    ALL_TYPES.reduce((acc, t) => { acc[t] = notifications.filter(n => n.type === t).length; return acc; }, {}),
    [notifications]
  );

  const filtered = useMemo(() =>
    notifications.filter(n => {
      const matchRead   = readFilter === 'all' || (readFilter === 'unread' ? !n.isRead : n.isRead);
      const matchType   = typeFilter === 'all' || n.type === typeFilter;
      const q           = search.toLowerCase();
      const matchSearch = !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
                               || (n.relatedTo ?? '').toLowerCase().includes(q);
      return matchRead && matchType && matchSearch;
    }),
    [notifications, readFilter, typeFilter, search]
  );

  function markRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }
  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }
  function openDetail(notif) {
    markRead(notif.id);
    setSelected(notif);
    setDialogOpen(true);
  }

  const KPI_CARDS = [
    { label: 'Total',     value: notifications.length,              accent: 'border-l-slate-400',   valueClass: 'text-foreground',  icon: Bell          },
    { label: 'Unread',    value: unreadCount,                        accent: 'border-l-blue-500',    valueClass: 'text-blue-600',    icon: Bell          },
    { label: 'Approved',  value: typeCounts.APPROVED ?? 0,           accent: 'border-l-emerald-500', valueClass: 'text-emerald-600', icon: CheckCircle2  },
    { label: 'Denied',    value: typeCounts.DENIED ?? 0,             accent: 'border-l-red-500',     valueClass: 'text-red-600',     icon: XCircle       },
    { label: 'Revisions', value: typeCounts.REVISION_REQUESTED ?? 0, accent: 'border-l-amber-500',   valueClass: 'text-amber-600',   icon: FilePen       },
    { label: 'Reminders', value: typeCounts.DEADLINE_REMINDER ?? 0,  accent: 'border-l-orange-500',  valueClass: 'text-orange-600',  icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : "You're all caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {KPI_CARDS.map((kpi) => {
          const KpiIcon = kpi.icon;
          return (
            <Card key={kpi.label} className={cn('border-l-4', kpi.accent)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                <KpiIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn('text-2xl font-bold', kpi.valueClass)}>{kpi.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Filter & List ── */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-muted-foreground" />
              All Notifications
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search…"
                  className="pl-9 h-8 text-sm w-52"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-44 text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ALL_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{TYPE_CONFIG[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Tabs value={readFilter} onValueChange={setReadFilter}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] min-w-4 h-4 px-1">
                    {notifications.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread
                  {unreadCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] min-w-4 h-4 px-1">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="read">
                  Read
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] min-w-4 h-4 px-1">
                    {readCount}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Inbox className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No notifications found</p>
              <p className="text-xs">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {filtered.map(notif => {
                  const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.SYSTEM;
                  const Icon = config.icon;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => openDetail(notif)}
                      className={cn(
                        'flex items-start gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/40 transition-colors',
                        !notif.isRead && 'border-l-4 border-l-blue-500 bg-blue-50/30'
                      )}
                    >
                      <span className={cn(
                        'shrink-0 flex items-center justify-center w-9 h-9 rounded-full mt-0.5',
                        config.badgeClass
                      )}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('text-sm font-medium', !notif.isRead ? 'text-foreground' : 'text-muted-foreground')}>
                            {notif.title}
                          </span>
                          <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', config.badgeClass)}>
                            {config.label}
                          </Badge>
                          {!notif.isRead && (
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {notif.body}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                          {notif.actor !== 'System' && <span>From: {notif.actor}</span>}
                          {notif.relatedTo && (
                            <span className="truncate max-w-40">Re: {notif.relatedTo}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-right mt-4">
                Showing {filtered.length} of {notifications.length} notifications
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <NotificationDetailDialog
        notification={selected}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
