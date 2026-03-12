import { useNavigate } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Bell,
  ArrowRight,
  Building2,
  Shield,
  Users,
  BarChart3,
  Loader2,
  Search,
  ShieldCheck,
  RefreshCw,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  LayoutGrid,
  Activity,
  Settings,
} from "lucide-react";
import { cn } from "../lib/utils";
import { getOfficeChecklist } from "../api/offices";
import { getGovernanceAreasWithStats, getComplianceMatrix } from "../api/governance";
import { getOffices } from "../api/offices";
import { getUsers } from "../api/users";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

const CARD_ACCENTS = [
  'border-l-blue-500', 'border-l-violet-500', 'border-l-emerald-500', 'border-l-amber-500',
  'border-l-slate-400', 'border-l-cyan-500', 'border-l-orange-500', 'border-l-indigo-500',
  'border-l-slate-400', 'border-l-rose-500',
];

function healthInfo(pct) {
  if (pct >= 80) return { bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', label: 'On Track' };
  if (pct >= 50) return { bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Needs Attention' };
  return             { bar: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50',   label: 'At Risk' };
}

/** Derive a per-item UI status the same way my-checklists-page does */
function deriveStatus(submission, dueDate) {
  if (!submission) {
    if (dueDate && new Date(dueDate) < new Date()) return "overdue";
    return "pending";
  }
  const s = submission.status?.toUpperCase();
  if (s === "APPROVED") return "completed";
  if (s === "PENDING") return "in-progress";
  // DENIED / REVISION_REQUESTED
  return "pending";
}

function OfficeDashboard({ user }) {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState([]);
  const [officeName, setOfficeName] = useState(user?.office || "");

  useEffect(() => {
    if (!user?.officeId) return;
    getOfficeChecklist(user.officeId, year)
      .then((res) => {
        const d = res.data;
        if (d?.office?.name) setOfficeName(d.office.name);
        setAreas(d?.areas ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.officeId, year]);

  // Compute summary from real data
  const allItems = areas.flatMap((a) =>
    a.items.map((item) => ({ ...item, areaName: a.name, status: deriveStatus(item.submission, item.dueDate) }))
  );
  const total = allItems.length;
  const completed = allItems.filter((i) => i.status === "completed").length;
  const inProgress = allItems.filter((i) => i.status === "in-progress").length;
  const pending = allItems.filter((i) => i.status === "pending").length;
  const overdue = allItems.filter((i) => i.status === "overdue").length;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Upcoming deadlines: not completed + has due date + sort soonest first
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingDeadlines = allItems
    .filter((i) => i.status !== "completed" && i.dueDate)
    .map((i) => ({
      title: i.title,
      category: i.areaName,
      daysLeft: Math.ceil((new Date(i.dueDate) - today) / 86400000),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  // Recent items: last 5 ordered by due date desc
  const recentItems = [...allItems]
    .sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""))
    .slice(0, 5);

  const statusConfig = {
    completed:     { label: "Completed",   color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
    "in-progress": { label: "In Progress", color: "bg-blue-100 text-blue-700",   icon: Clock },
    pending:       { label: "Pending",     color: "bg-gray-100 text-gray-600",   icon: Clock },
    overdue:       { label: "Overdue",     color: "bg-red-100 text-red-700",     icon: AlertCircle },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Office Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, <span className="font-medium text-foreground">{user?.name || user?.email}</span>
            {officeName && <> · <span className="text-red-600 font-medium">{officeName}</span></>}
          </p>
        </div>
        <Button onClick={() => navigate("/my-checklists")} className="shrink-0">
          <ClipboardList className="mr-2 h-4 w-4" />
          View My Checklists
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          Loading dashboard…
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Checklist Items</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{total}</div>
                <p className="text-xs text-muted-foreground">Across all governance areas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{completed}</div>
                <p className="text-xs text-muted-foreground">{completionPct}% completion rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
                <p className="text-xs text-muted-foreground">{pending} still pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{overdue}</div>
                <p className="text-xs text-muted-foreground">Requires immediate attention</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Overall Progress */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  Overall Compliance Progress
                </CardTitle>
                <CardDescription>Your office checklist completion for {year}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Overall Completion</span>
                    <span className="text-muted-foreground">{completed}/{total}</span>
                  </div>
                  <Progress value={completionPct} className="h-3" />
                  <p className="text-xs text-muted-foreground">{completionPct}% complete</p>
                </div>

                {areas.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {areas.map((area) => {
                      const aItems = area.items.map((i) => deriveStatus(i.submission, i.dueDate));
                      const aDone = aItems.filter((s) => s === "completed").length;
                      const aTotal = aItems.length;
                      const aPct = aTotal > 0 ? Math.round((aDone / aTotal) * 100) : 0;
                      return (
                        <div key={area.id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{area.name}</span>
                            <span className="font-medium">{aDone}/{aTotal}</span>
                          </div>
                          <Progress value={aPct} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {areas.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No governance areas assigned yet. Contact your administrator.
                  </p>
                )}

                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate("/my-checklists")}>
                  View All Checklist Items
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  Upcoming Deadlines
                </CardTitle>
                <CardDescription>Items due soon</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines.</p>
                ) : (
                  upcomingDeadlines.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 pb-3 border-b last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={item.daysLeft <= 0 ? "bg-red-100 text-red-700 shrink-0" : item.daysLeft <= 5 ? "bg-red-100 text-red-700 shrink-0" : "bg-amber-100 text-amber-700 shrink-0"}
                      >
                        {item.daysLeft <= 0 ? "Overdue" : `${item.daysLeft}d left`}
                      </Badge>
                    </div>
                  ))
                )}
                <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => navigate("/my-checklists")}>
                  See All Deadlines
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Checklist Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Recent Checklist Items
              </CardTitle>
              <CardDescription>Your latest checklist activity</CardDescription>
            </CardHeader>
            <CardContent>
              {recentItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No checklist items found.</p>
              ) : (
                <div className="space-y-2">
                  {recentItems.map((item) => {
                    const cfg = statusConfig[item.status] ?? statusConfig.pending;
                    const Icon = cfg.icon;
                    const dueFmt = item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—";
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`h-4 w-4 shrink-0 ${item.status === "overdue" ? "text-red-600" : item.status === "completed" ? "text-green-600" : "text-blue-600"}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.areaName} · Due {dueFmt}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className={`${cfg.color} shrink-0 text-xs`}>
                          {cfg.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => navigate("/my-checklists")}>
                View All Checklist Items
                <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Status config for compliance cells ──────────────────────────────────────
const COMPLIANCE_STATUS = {
  APPROVED:           { label: 'Approved',       color: 'text-green-700',  bg: 'bg-green-50',   bar: 'bg-green-500'  },
  PENDING:            { label: 'Pending',        color: 'text-amber-700',  bg: 'bg-amber-50',   bar: 'bg-amber-400'  },
  DENIED:             { label: 'Denied',         color: 'text-red-700',    bg: 'bg-red-50',     bar: 'bg-red-500'    },
  REVISION_REQUESTED: { label: 'Needs Revision', color: 'text-orange-700', bg: 'bg-orange-50',  bar: 'bg-orange-500' },
  NOT_SUBMITTED:      { label: 'Not Submitted',  color: 'text-gray-500',   bg: 'bg-muted/30',   bar: 'bg-muted'      },
};

function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // ── Live clock ───────────────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const dateStr = now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // ── Year filter ──────────────────────────────────────────────────────────────
  const [year, setYear] = useState(currentYear);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // ── Shared data ─────────────────────────────────────────────────────────────
  const [areas,   setAreas]   = useState([]);
  const [offices, setOffices] = useState([]);
  const [users,   setUsers]   = useState([]);
  const [matrix,  setMatrix]  = useState({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // ── Governance tab filters ───────────────────────────────────────────────────
  const [searchQuery,   setSearchQuery]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [healthFilter,  setHealthFilter]  = useState('all');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [areasRes, officesRes, usersRes, matrixRes] = await Promise.allSettled([
        getGovernanceAreasWithStats(year),
        getOffices(),
        getUsers(),
        getComplianceMatrix(year),
      ]);
      if (areasRes.status === 'fulfilled')   setAreas(areasRes.value.governanceAreas   || []);
      if (officesRes.status === 'fulfilled') setOffices(officesRes.value.offices        || []);
      if (usersRes.status === 'fulfilled')   setUsers(usersRes.value.users             || []);
      if (matrixRes.status === 'fulfilled') {
        const m = {};
        for (const cell of (matrixRes.value.cells || [])) {
          if (!m[cell.governance_area_id]) m[cell.governance_area_id] = {};
          m[cell.governance_area_id][cell.office_id] = cell.status;
        }
        setMatrix(m);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, [year]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Computed values ────────────────────────────────────────────────────────
  const activeAreas   = areas.filter((a) => a.is_active);
  const activeOffices = offices.filter((o) => o.is_active);
  const totalSubmissions = areas.reduce((s, a) => s + (a.submissions || 0), 0);
  const totalTemplates   = areas.reduce((s, a) => s + (a.templates   || 0), 0);
  const atRiskCount      = activeAreas.filter((a) => a.offices_total > 0 && (a.offices_compliant / a.offices_total) < 0.5).length;

  const totalCells     = activeAreas.length * activeOffices.length;
  const approvedCells  = activeAreas.reduce((s, a) => s + activeOffices.filter((o) => matrix[a.id]?.[o.id] === 'APPROVED').length, 0);
  const overallPct     = totalCells > 0 ? Math.round((approvedCells / totalCells) * 100) : 0;

  const adminCount  = users.filter((u) => u.role?.toUpperCase() === 'ADMIN').length;
  const staffCount  = users.filter((u) => u.role?.toUpperCase() === 'STAFF').length;
  const officeCount = users.filter((u) => u.role?.toUpperCase() === 'OFFICE').length;

  // ── Chart data ──────────────────────────────────────────────────────────────
  const areaChartData = activeAreas.map((a) => ({
    name: a.code,
    pct: a.offices_total > 0 ? Math.round((a.offices_compliant / a.offices_total) * 100) : 0,
  }));
  const roleData = [
    { name: 'Admin',  value: adminCount,  fill: '#3b82f6' },
    { name: 'Staff',  value: staffCount,  fill: '#8b5cf6' },
    { name: 'Office', value: officeCount, fill: '#10b981' },
  ].filter((d) => d.value > 0);

  // Health distribution for pie chart
  const healthDistData = [
    { name: 'On Track (≥80%)',      value: activeAreas.filter((a) => a.offices_total > 0 && (a.offices_compliant / a.offices_total) >= 0.8).length,  fill: '#22c55e' },
    { name: 'Needs Attention',      value: activeAreas.filter((a) => a.offices_total > 0 && (a.offices_compliant / a.offices_total) >= 0.5 && (a.offices_compliant / a.offices_total) < 0.8).length, fill: '#f59e0b' },
    { name: 'At Risk (<50%)',        value: atRiskCount, fill: '#ef4444' },
    { name: 'No Data',              value: activeAreas.filter((a) => !a.offices_total).length, fill: '#d1d5db' },
  ].filter((d) => d.value > 0);

  // Office leaderboard — approval rate per office across all active areas
  const officeLeaderboard = (activeOffices.length > 0 ? activeOffices : offices)
    .map((o) => {
      const areasToCheck = activeAreas.length > 0 ? activeAreas : areas;
      const total    = areasToCheck.length;
      const approved = areasToCheck.filter((a) => matrix[a.id]?.[o.id] === 'APPROVED').length;
      const pct      = total > 0 ? Math.round((approved / total) * 100) : 0;
      return { id: o.id, name: o.name, approved, total, pct };
    })
    .sort((a, b) => b.pct - a.pct);
  const top5    = officeLeaderboard.slice(0, 5);
  const bottom5 = officeLeaderboard.slice(-5).reverse();

  // Areas with zero submissions
  const zeroSubmissionAreas = areas.filter((a) => !a.submissions || a.submissions === 0);

  const officeStatusOffices = activeOffices.length > 0 ? activeOffices : offices;
  const officeStatusAreas   = activeAreas.length   > 0 ? activeAreas   : areas;
  const officeStatusData = officeStatusOffices.map((o) => {
    let approved = 0, pending = 0, denied = 0, revision = 0, notSubmitted = 0;
    for (const area of officeStatusAreas) {
      const s = matrix[area.id]?.[o.id] || 'NOT_SUBMITTED';
      if (s === 'APPROVED')           approved++;
      else if (s === 'PENDING')       pending++;
      else if (s === 'DENIED')        denied++;
      else if (s === 'REVISION_REQUESTED') revision++;
      else                            notSubmitted++;
    }
    return {
      name: o.name.length > 20 ? o.name.slice(0, 18) + '…' : o.name,
      Approved: approved,
      Pending: pending,
      Denied: denied,
      'Needs Revision': revision,
      'Not Submitted': notSubmitted,
    };
  });

  // Governance tab filtered areas
  const filteredAreas = areas.filter((a) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active'   && a.is_active) ||
      (statusFilter === 'inactive' && !a.is_active);
    const pct = a.offices_total > 0 ? Math.round((a.offices_compliant / a.offices_total) * 100) : 0;
    const matchHealth =
      healthFilter === 'all' ||
      (healthFilter === 'on-track'  && pct >= 80) ||
      (healthFilter === 'attention' && pct >= 50 && pct < 80) ||
      (healthFilter === 'at-risk'   && pct < 50);
    return matchSearch && matchStatus && matchHealth;
  });

  // ── Quick action tiles ─────────────────────────────────────────────────────
  const quickActions = [
    { label: 'Manage Areas',       icon: ShieldCheck, path: '/governance/manage',   color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Compliance Matrix',  icon: BarChart3,   path: '/governance/compliance',color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Manage Offices',     icon: Building2,   path: '/offices',              color: 'text-emerald-600',bg: 'bg-emerald-50'},
    { label: 'Manage Users',       icon: Users,       path: '/users',                color: 'text-amber-600',  bg: 'bg-amber-50'  },
    { label: 'All Templates',      icon: FileText,    path: '/templates',            color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Submissions',        icon: ClipboardList,path: '/submissions',         color: 'text-rose-600',   bg: 'bg-rose-50'   },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, <span className="font-medium text-foreground">{user?.name || user?.email}</span>
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{dateStr}</span>
            <span className="text-xs font-mono font-semibold text-foreground tabular-nums">{timeStr}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</> : <><RefreshCw className="mr-2 h-4 w-4" />Refresh</>}
          </Button>
          {lastRefreshed && !loading && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Updated {lastRefreshed.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
          <span>{error}</span>
          <button className="ml-auto text-red-500 hover:text-red-700" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="overview"    className="flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="governance"  className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Governance</TabsTrigger>
          <TabsTrigger value="compliance"  className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Compliance</TabsTrigger>
          <TabsTrigger value="org"         className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Org</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════ OVERVIEW TAB ════════════════════ */}
        <TabsContent value="overview" className="space-y-6">

          {/* KPI Strip */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-3" />Loading…
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Gov. Areas</CardTitle>
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{activeAreas.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">of {areas.length} total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Offices</CardTitle>
                    <Building2 className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{activeOffices.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">of {offices.length} total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">across all roles</p>
                  </CardContent>
                </Card>
                <Card className={atRiskCount > 0 ? 'border-red-200 bg-red-50/30' : ''}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">At Risk Areas</CardTitle>
                    <AlertTriangle className={cn('h-4 w-4', atRiskCount > 0 ? 'text-red-500' : 'text-muted-foreground')} />
                  </CardHeader>
                  <CardContent>
                    <div className={cn('text-2xl font-bold', atRiskCount > 0 ? 'text-red-600' : '')}>{atRiskCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">below 50% compliance</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {/* System Snapshot */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-muted-foreground" />
                      System Snapshot — {year}
                    </CardTitle>
                    <CardDescription>High-level overview of system activity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Overall compliance bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Overall Compliance</span>
                        <span className={cn('font-bold', overallPct >= 80 ? 'text-green-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-600')}>{overallPct}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div className={cn('h-3 rounded-full transition-all', overallPct >= 80 ? 'bg-green-500' : overallPct >= 50 ? 'bg-amber-400' : 'bg-red-500')} style={{ width: `${overallPct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{approvedCells} of {totalCells} area-office combinations approved</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      {[
                        { label: 'Checklist Templates', value: totalTemplates, icon: FileText,     color: 'text-indigo-600' },
                        { label: 'Submissions',          value: totalSubmissions, icon: ClipboardList, color: 'text-emerald-600' },
                        { label: 'Admins / Staff',       value: `${adminCount} / ${staffCount}`,  icon: Shield,       color: 'text-blue-600' },
                        { label: 'Office Accounts',      value: officeCount,      icon: Building2,    color: 'text-amber-600' },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="flex items-center gap-3">
                          <div className={cn('p-2 rounded-lg bg-muted', color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-sm font-semibold">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/governance/compliance')}>
                      View Full Compliance Matrix <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      Quick Actions
                    </CardTitle>
                    <CardDescription>Jump to frequently used pages</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    {quickActions.map(({ label, icon: Icon, path, color, bg }) => (
                      <button
                        key={path}
                        onClick={() => navigate(path)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all hover:shadow-sm hover:-translate-y-0.5 cursor-pointer',
                          bg
                        )}
                      >
                        <Icon className={cn('h-5 w-5', color)} />
                        <span className="text-xs font-medium leading-tight">{label}</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Bar Chart — Compliance by Area */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      Compliance by Area
                    </CardTitle>
                    <CardDescription>% of offices approved per governance area</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {areaChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No active areas found</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={areaChartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                          <RechartsTooltip
                            formatter={(v) => [`${v}%`, 'Compliance']}
                            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                          />
                          <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            {areaChartData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={entry.pct >= 80 ? '#22c55e' : entry.pct >= 50 ? '#f59e0b' : '#ef4444'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Pie Chart — User Role Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      User Role Distribution
                    </CardTitle>
                    <CardDescription>Breakdown of user accounts by role</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {roleData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={roleData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {roleData.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(v, n) => [v, n]}
                            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                          />
                          <Legend formatter={(value) => <span style={{ fontSize: '12px' }}>{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Submission Status per Office */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    Submission Status per Office
                  </CardTitle>
                  <CardDescription>Breakdown of submission statuses across all governance areas for each office</CardDescription>
                </CardHeader>
                <CardContent>
                  {officeStatusData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No active offices or governance areas found</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(220, officeStatusData.length * 40)}>
                      <BarChart
                        layout="vertical"
                        data={officeStatusData}
                        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                        <Bar dataKey="Approved"       stackId="a" fill="#22c55e" radius={[0,0,0,0]} maxBarSize={22} />
                        <Bar dataKey="Pending"        stackId="a" fill="#f59e0b" maxBarSize={22} />
                        <Bar dataKey="Needs Revision" stackId="a" fill="#f97316" maxBarSize={22} />
                        <Bar dataKey="Denied"         stackId="a" fill="#ef4444" maxBarSize={22} />
                        <Bar dataKey="Not Submitted"  stackId="a" fill="#d1d5db" radius={[0,4,4,0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* At-Risk Areas Table */}
              {atRiskCount > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      At-Risk Areas
                    </CardTitle>
                    <CardDescription>Governance areas with compliance below 50%</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Code</th>
                            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Area Name</th>
                            <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Offices Compliant</th>
                            <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Compliance %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeAreas
                            .filter((a) => a.offices_total > 0 && (a.offices_compliant / a.offices_total) < 0.5)
                            .map((a, i) => {
                              const pct = Math.round((a.offices_compliant / a.offices_total) * 100);
                              return (
                                <tr key={a.id} className={cn('border-t', i % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{a.code}</td>
                                  <td className="px-4 py-3 font-medium">{a.name}</td>
                                  <td className="px-4 py-3 text-center text-muted-foreground">{a.offices_compliant} / {a.offices_total}</td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge variant="destructive" className="text-xs">{pct}%</Badge>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Health Distribution + Office Leaderboard */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* #4 Compliance Health Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-muted-foreground" />
                      Compliance Health Distribution
                    </CardTitle>
                    <CardDescription>How governance areas are spread across health levels</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {healthDistData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No active areas found</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={healthDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={3} dataKey="value" label={({ value }) => `${value}`}>
                            {healthDistData.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(v, n) => [v + ' area(s)', n]} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                          <Legend formatter={(value) => <span style={{ fontSize: '11px' }}>{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* #5 Office Leaderboard */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      Office Compliance Leaderboard
                    </CardTitle>
                    <CardDescription>Top 5 and bottom 5 offices by approval rate</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {officeLeaderboard.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No office data available</p>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🏆 Top 5</p>
                        <div className="space-y-1.5">
                          {top5.map((o, i) => (
                            <div key={o.id} className="flex items-center gap-2">
                              <span className="w-5 text-xs text-center font-bold text-muted-foreground">{i + 1}</span>
                              <span className="flex-1 text-xs truncate" title={o.name}>{o.name}</span>
                              <div className="w-24 bg-muted rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${o.pct}%` }} />
                              </div>
                              <span className="text-xs font-semibold w-9 text-right text-green-700">{o.pct}%</span>
                            </div>
                          ))}
                        </div>
                        {bottom5.length > 0 && bottom5[0].id !== top5[top5.length - 1]?.id && (
                          <>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">⚠ Bottom 5</p>
                            <div className="space-y-1.5">
                              {bottom5.map((o, i) => (
                                <div key={o.id} className="flex items-center gap-2">
                                  <span className="w-5 text-xs text-center font-bold text-muted-foreground">{officeLeaderboard.length - i}</span>
                                  <span className="flex-1 text-xs truncate" title={o.name}>{o.name}</span>
                                  <div className="w-24 bg-muted rounded-full h-1.5">
                                    <div className={cn('h-1.5 rounded-full', o.pct >= 50 ? 'bg-amber-400' : 'bg-red-500')} style={{ width: `${o.pct}%` }} />
                                  </div>
                                  <span className={cn('text-xs font-semibold w-9 text-right', o.pct >= 50 ? 'text-amber-700' : 'text-red-700')}>{o.pct}%</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* #6 Areas with Zero Submissions */}
              {zeroSubmissionAreas.length > 0 && (
                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      Areas with No Submissions
                    </CardTitle>
                    <CardDescription>{zeroSubmissionAreas.length} governance area{zeroSubmissionAreas.length > 1 ? 's have' : ' has'} received zero submissions for {year}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {zeroSubmissionAreas.map((a) => (
                        <div key={a.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-xs">
                          <span className="font-mono font-semibold text-amber-700">{a.code}</span>
                          <span className="text-amber-600">{a.name}</span>
                          {!a.is_active && <Badge variant="outline" className="text-[10px] py-0 px-1 h-4 border-amber-300 text-amber-600">Inactive</Badge>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ══════════════════════════ GOVERNANCE TAB ═══════════════════════ */}
        <TabsContent value="governance" className="space-y-5">
          {/* Stats row */}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: 'Active Areas',   value: activeAreas.length,   sub: `of ${areas.length} total`,       icon: MapPin,      color: 'text-blue-500' },
              { label: 'Templates',       value: totalTemplates,        sub: 'across active areas',            icon: FileText,    color: 'text-indigo-500' },
              { label: 'Submissions',     value: totalSubmissions,      sub: `for ${year}`,                    icon: ClipboardList,color: 'text-emerald-500' },
              { label: 'At Risk',         value: atRiskCount,           sub: 'below 50% compliance',           icon: AlertTriangle,color: atRiskCount > 0 ? 'text-red-500' : 'text-muted-foreground', warn: atRiskCount > 0 },
            ].map(({ label, value, sub, icon: Icon, color, warn }) => (
              <Card key={label} className={warn ? 'border-red-200 bg-red-50/30' : ''}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  <Icon className={cn('h-4 w-4', color)} />
                </CardHeader>
                <CardContent>
                  <div className={cn('text-2xl font-bold', warn ? 'text-red-600' : '')}>{value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by code, name, or description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={healthFilter} onValueChange={setHealthFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Health" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Health</SelectItem>
                <SelectItem value="on-track">✅ On Track (≥80%)</SelectItem>
                <SelectItem value="attention">⚠️ Needs Attention</SelectItem>
                <SelectItem value="at-risk">🔴 At Risk (&lt;50%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Area Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-3" />Loading governance areas…
            </div>
          ) : filteredAreas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No governance areas match your filters.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAreas.map((area) => {
                const pct    = area.is_active && area.offices_total > 0 ? Math.round((area.offices_compliant / area.offices_total) * 100) : null;
                const health = pct !== null ? healthInfo(pct) : null;
                return (
                  <Card
                    key={area.id}
                    className={cn('border-l-4 transition-all hover:shadow-md cursor-pointer group', area.is_active ? CARD_ACCENTS[(area.sort_order - 1) % CARD_ACCENTS.length] : 'border-l-slate-300 opacity-55')}
                    onClick={() => navigate('/governance/compliance')}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs shrink-0">{area.code}</Badge>
                          {!area.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                          {health && (
                            <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', health.bg, health.text)}>{health.label}</span>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <CardTitle className="text-base leading-snug mt-1">{area.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{area.description || '—'}</p>
                      {area.is_active ? (
                        <>
                          {pct !== null && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Office compliance</span>
                                <span className={cn('font-semibold', health?.text)}>{area.offices_compliant}/{area.offices_total} — {pct}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div className={cn('h-2 rounded-full transition-all', health?.bar)} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )}
                          <div className="flex gap-4 pt-1 border-t text-center">
                            <div><p className="text-xs text-muted-foreground">Templates</p><p className="text-sm font-semibold">{area.templates}</p></div>
                            <div><p className="text-xs text-muted-foreground">Submissions</p><p className="text-sm font-semibold">{area.submissions}</p></div>
                            <div className="ml-auto self-center"><span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">View matrix →</span></div>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic pt-1 border-t">No active templates — not yet tracked.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════ COMPLIANCE TAB ══════════════════════ */}
        <TabsContent value="compliance" className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-3" />Loading compliance data…
            </div>
          ) : (
            <>
              {/* Overall bar */}
              <Card className={cn('border-l-4', overallPct >= 80 ? 'border-l-green-500' : overallPct >= 50 ? 'border-l-amber-400' : 'border-l-red-500')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold">Overall Compliance — {year}</span>
                      <p className="text-xs text-muted-foreground">{approvedCells} of {totalCells} area-office combinations approved</p>
                    </div>
                    <span className={cn('text-3xl font-bold', overallPct >= 80 ? 'text-green-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-600')}>{overallPct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div className={cn('h-3 rounded-full transition-all', overallPct >= 80 ? 'bg-green-500' : overallPct >= 50 ? 'bg-amber-400' : 'bg-red-500')} style={{ width: `${overallPct}%` }} />
                  </div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/governance/compliance')}>
                    Open Full Compliance Matrix <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>

              {/* Per-area compliance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Governance Area Progress</CardTitle>
                  <CardDescription>Approved offices per area</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeAreas.map((area) => {
                    const approved = activeOffices.filter((o) => matrix[area.id]?.[o.id] === 'APPROVED').length;
                    const total    = activeOffices.length;
                    const pct      = total > 0 ? Math.round((approved / total) * 100) : 0;
                    const color    = pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700';
                    const bar      = pct >= 80 ? 'bg-green-500'  : pct >= 50 ? 'bg-amber-400'   : 'bg-red-500';
                    return (
                      <div key={area.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="font-mono text-xs shrink-0">{area.code}</Badge>
                            <span className="truncate text-sm">{area.name}</span>
                          </div>
                          <span className={cn('font-semibold shrink-0 ml-2', color)}>{approved}/{total} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className={cn('h-2 rounded-full transition-all', bar)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {activeAreas.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active governance areas.</p>}
                </CardContent>
              </Card>

              {/* Per-office compliance summary cards */}
              <div>
                <h2 className="text-base font-semibold mb-3">Office-by-Office Summary</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {activeOffices.map((o) => {
                    const approved     = activeAreas.filter((a) => matrix[a.id]?.[o.id] === 'APPROVED').length;
                    const pending      = activeAreas.filter((a) => matrix[a.id]?.[o.id] === 'PENDING').length;
                    const denied       = activeAreas.filter((a) => matrix[a.id]?.[o.id] === 'DENIED').length;
                    const revision     = activeAreas.filter((a) => matrix[a.id]?.[o.id] === 'REVISION_REQUESTED').length;
                    const notSubmitted = activeAreas.filter((a) => !matrix[a.id]?.[o.id]).length;
                    const total        = activeAreas.length;
                    const pct          = total > 0 ? Math.round((approved / total) * 100) : 0;
                    return (
                      <Card key={o.id}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Badge variant="outline" className="font-mono text-xs mb-1">{o.code}</Badge>
                              <p className="text-sm font-medium">{o.name}</p>
                            </div>
                            <span className={cn('text-lg font-bold', pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600')}>{pct}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 mb-2">
                            <div className={cn('h-2 rounded-full', pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500')} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex flex-wrap gap-1 text-xs">
                            <span className="text-green-700 bg-green-50 rounded px-1.5 py-0.5 border border-green-200">{approved} approved</span>
                            {pending > 0      && <span className="text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200">{pending} pending</span>}
                            {denied > 0       && <span className="text-red-700 bg-red-50 rounded px-1.5 py-0.5 border border-red-200">{denied} denied</span>}
                            {revision > 0     && <span className="text-orange-700 bg-orange-50 rounded px-1.5 py-0.5 border border-orange-200">{revision} revision</span>}
                            {notSubmitted > 0 && <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 border">{notSubmitted} missing</span>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {activeOffices.length === 0 && <p className="text-sm text-muted-foreground col-span-3 text-center py-8">No active offices found.</p>}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ════════════════════════════ ORG TAB ════════════════════════════ */}
        <TabsContent value="org" className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-3" />Loading org data…
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                {[
                  { label: 'Total Users',      value: users.length,          sub: 'system accounts',    icon: Users,    color: 'text-blue-500'   },
                  { label: 'Admins',           value: adminCount,            sub: 'administrators',     icon: Shield,   color: 'text-violet-500' },
                  { label: 'Staff',            value: staffCount,            sub: 'staff accounts',     icon: Users,    color: 'text-amber-500'  },
                  { label: 'Office Accounts',  value: officeCount,           sub: 'office head accounts',icon: Building2,color: 'text-emerald-500'},
                ].map(({ label, value, sub, icon: Icon, color }) => (
                  <Card key={label}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{label}</CardTitle>
                      <Icon className={cn('h-4 w-4', color)} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{value}</div>
                      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Office list */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />Offices</CardTitle>
                      <CardDescription>{activeOffices.length} active of {offices.length} total</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/offices')}>Manage <ArrowRight className="ml-1 h-3 w-3" /></Button>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                    {offices.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No offices found.</p>
                    ) : offices.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="font-mono text-xs shrink-0">{o.code}</Badge>
                          <span className="text-sm truncate">{o.name}</span>
                        </div>
                        {o.is_active
                          ? <Badge className="bg-green-100 text-green-700 text-xs shrink-0">Active</Badge>
                          : <Badge variant="secondary" className="text-xs shrink-0">Inactive</Badge>}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* User list */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Users</CardTitle>
                      <CardDescription>{users.filter((u) => u.is_active !== false).length} active of {users.length} total</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/users')}>Manage <ArrowRight className="ml-1 h-3 w-3" /></Button>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                    {users.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No users found.</p>
                    ) : users.map((u) => {
                      const rolePill = {
                        ADMIN:  'bg-violet-100 text-violet-700',
                        STAFF:  'bg-blue-100 text-blue-700',
                        OFFICE: 'bg-emerald-100 text-emerald-700',
                      }[u.role?.toUpperCase()] || 'bg-muted text-muted-foreground';
                      return (
                        <div key={u.id} className="flex items-center justify-between rounded-lg border px-3 py-2 gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                          <Badge className={cn('text-xs shrink-0', rolePill)}>{u.role}</Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role?.toUpperCase() === "OFFICE") return <OfficeDashboard user={user} />;
  return <AdminDashboard user={user} />;
}