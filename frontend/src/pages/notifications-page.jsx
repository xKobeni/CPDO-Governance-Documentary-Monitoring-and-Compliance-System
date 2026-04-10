import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
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
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  Inbox,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  ALL_NOTIFICATION_TYPES,
  formatNotificationDateTime,
  formatNotificationRelativeTime,
  getNotificationTypeConfig,
} from '../lib/notifications';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '../hooks/use-notifications';
import { useAuth } from '../hooks/use-auth';

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION DETAIL DIALOG
// ─────────────────────────────────────────────────────────────────────────────
function NotificationDetailDialog({ notification, open, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  if (!notification) return null;
  const config = getNotificationTypeConfig(notification.type);
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
                  <p className="mt-0.5">{notification.actor ?? 'System'}</p>
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
                    {formatNotificationDateTime(notification.createdAt)}
                  </p>
                </div>
              </div>

              {notification.submissionId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs mt-1"
                  onClick={() => {
                    if (role === 'OFFICE') {
                      navigate('/my-checklists');
                    } else {
                      navigate('/submissions');
                    }
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {role === 'OFFICE' ? 'View Checklist' : 'View Submission'}
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
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const notificationsQuery = useNotifications({ page: 1, limit: 100 });
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const notifications = notificationsQuery.data?.data ?? [];
  const isInitialLoading = notificationsQuery.isLoading && notifications.length === 0;
  const hasError = notificationsQuery.isError;

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount   = notifications.filter(n =>  n.isRead).length;
  const typeCounts  = useMemo(() =>
    ALL_NOTIFICATION_TYPES.reduce((acc, t) => { acc[t] = notifications.filter(n => n.type === t).length; return acc; }, {}),
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
    return markAsReadMutation.mutateAsync(id);
  }

  function markAllRead() {
    return markAllAsReadMutation.mutateAsync();
  }

  function openDetail(notif) {
    const nextNotification = notif.isRead ? notif : { ...notif, isRead: true };
    setSelected(nextNotification);
    setDialogOpen(true);

    if (!notif.isRead) {
      markRead(notif.id).catch(() => {});
    }
  }

  const KPI_CARDS = [
    { label: 'Total',     value: notifications.length,              accent: 'border-l-slate-400',   valueClass: 'text-foreground',  icon: Bell          },
    { label: 'Unread',    value: unreadCount,                        accent: 'border-l-blue-500',    valueClass: 'text-blue-600',    icon: Bell          },
    { label: 'Comments',  value: typeCounts.NEW_COMMENT ?? 0,        accent: 'border-l-slate-500',    valueClass: 'text-slate-600',   icon: getNotificationTypeConfig('NEW_COMMENT').icon },
    { label: 'Replaced',  value: typeCounts.FILE_REPLACED ?? 0,      accent: 'border-l-purple-500',  valueClass: 'text-purple-600',  icon: getNotificationTypeConfig('FILE_REPLACED').icon },
    { label: 'Approved',  value: typeCounts.APPROVED ?? 0,           accent: 'border-l-emerald-500', valueClass: 'text-emerald-600', icon: getNotificationTypeConfig('APPROVED').icon },
    { label: 'Denied',    value: typeCounts.DENIED ?? 0,             accent: 'border-l-red-500',     valueClass: 'text-red-600',     icon: getNotificationTypeConfig('DENIED').icon },
    { label: 'Revisions', value: typeCounts.REVISION_REQUESTED ?? 0, accent: 'border-l-amber-500',   valueClass: 'text-amber-600',   icon: getNotificationTypeConfig('REVISION_REQUESTED').icon },
    { label: 'Reminders', value: typeCounts.DEADLINE_REMINDER ?? 0,  accent: 'border-l-orange-500',  valueClass: 'text-orange-600',  icon: getNotificationTypeConfig('DEADLINE_REMINDER').icon },
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
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => markAllRead().catch(() => {})}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={() => notificationsQuery.refetch()}
            disabled={notificationsQuery.isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', notificationsQuery.isFetching && 'animate-spin')} />
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
                  {ALL_NOTIFICATION_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{getNotificationTypeConfig(t).label}</SelectItem>
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
          {isInitialLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <RefreshCw className="h-10 w-10 animate-spin opacity-50" />
              <p className="text-sm font-medium">Loading notifications</p>
              <p className="text-xs">Fetching the latest data from the backend.</p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Inbox className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">Unable to load notifications</p>
              <Button variant="outline" size="sm" onClick={() => notificationsQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Inbox className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No notifications found</p>
              <p className="text-xs">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {filtered.map(notif => {
                  const config = getNotificationTypeConfig(notif.type);
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
                            {formatNotificationRelativeTime(notif.createdAt)}
                          </span>
                          {notif.actor && notif.actor !== 'System' && <span>From: {notif.actor}</span>}
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
