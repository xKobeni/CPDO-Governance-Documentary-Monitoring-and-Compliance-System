import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  BarChart3,
  FileX,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  FileText,
  Download,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Building2,
  Loader2,
  Trophy,
  Printer,
  Activity,
  Medal,
  ShieldCheck,
  TimerOff,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import {
  getReportSummary,
  getNoUploadReport,
  getReportOverview,
  getComplianceProgress,
  downloadComplianceProgress,
} from '../api/reports';
import { getYears } from '../api/years';
import { getOffices } from '../api/offices';
import { useAuth } from '../hooks/use-auth';
import HelpTourOverlay from '../components/help-tour-overlay';

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  APPROVED:           { label: 'Approved',      icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-100',  bar: '#22c55e', badge: 'bg-green-100 text-green-700 border-green-200' },
  PENDING:            { label: 'Pending',        icon: Clock,        color: 'text-amber-600',  bg: 'bg-amber-100',  bar: '#f59e0b', badge: 'bg-amber-100 text-amber-700 border-amber-200'  },
  REVISION_REQUESTED: { label: 'Needs Revision', icon: RotateCcw,    color: 'text-orange-600', bg: 'bg-orange-100', bar: '#f97316', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  DENIED:             { label: 'Denied',         icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-100',    bar: '#ef4444', badge: 'bg-red-100 text-red-700 border-red-200'         },
};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COMPLIANCE_STATUS_CONFIG = {
  NOT_STARTED: { label: 'Not Started', color: 'text-slate-600', bg: 'bg-slate-100', bar: '#64748b' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-100', bar: '#3b82f6' },
  UNDER_REVIEW: { label: 'Under Review', color: 'text-amber-600', bg: 'bg-amber-100', bar: '#f59e0b' },
  COMPLIANT: { label: 'Compliant', color: 'text-green-600', bg: 'bg-green-100', bar: '#22c55e' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, bg, accentBar, pct }) {
  return (
    <Card className="relative overflow-hidden">
      {accentBar && (
        <div
          className={cn('absolute bottom-0 left-0 h-1 transition-all', accentBar)}
          style={{ width: `${pct ?? 0}%` }}
        />
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <div className={cn('p-1.5 rounded-md', bg ?? 'bg-muted')}>
          <Icon className={cn('h-4 w-4', color ?? 'text-muted-foreground')} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', color ?? '')}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function LoadingRows({ n = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-1.5">
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-2 bg-muted rounded w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon = AlertCircle, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
      <Icon className="h-10 w-10 opacity-30" />
      {title && <p className="font-medium">{title}</p>}
      {sub && <p className="text-sm">{sub}</p>}
    </div>
  );
}

function downloadCSV(filename, csvString) {
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildContextHeader(title, year, officeName) {
  const generatedAt = new Date().toLocaleString('en-PH');
  return [
    `"${title}"`,
    `"Year:","${year}"`,
    officeName ? `"Office:","${officeName}"` : null,
    `"Generated at:","${generatedAt}"`,
    '',
  ]
    .filter((l) => l !== null)
    .join('\n') + '\n';
}

function toSlug(str) {
  return str.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
}

// ─── Missing-uploads helpers (unchanged logic) ────────────────────────────────
function buildMissingTree(items) {
  const sorted = [...items].sort((a, b) =>
    String(a.item_code || '').localeCompare(String(b.item_code || ''), undefined, { numeric: true })
  );
  const nodeMap = {};
  for (const item of sorted) {
    const code = String(item.item_code || item.checklist_item_id);
    nodeMap[code] = { ...item, _code: code, children: [] };
  }
  const codes = Object.keys(nodeMap);
  for (const node of Object.values(nodeMap)) {
    node._isParent = codes.some((c) => c !== node._code && c.startsWith(node._code + '.'));
  }
  const roots = [];
  for (const node of Object.values(nodeMap)) {
    const parts = node._code.split('.');
    if (parts.length === 1) {
      roots.push(node);
    } else {
      const parentCode = parts.slice(0, -1).join('.');
      if (nodeMap[parentCode]) nodeMap[parentCode].children.push(node);
      else roots.push(node);
    }
  }
  return roots;
}

function countLeaves(nodes) {
  let n = 0;
  for (const node of nodes) {
    if (node._isParent) n += countLeaves(node.children);
    else n++;
  }
  return n;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';
  // OFFICE users never select an office — the backend fills it from their session
  const isOfficeUser = user?.role === 'OFFICE';

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // ── Queries ──────────────────────────────────────────────────────────────────
  const yearsQuery = useQuery({
    queryKey: ['years', 'active'],
    queryFn: () => getYears({ includeInactive: false }),
    staleTime: 10 * 60 * 1000,
  });

  // GET /offices is ADMIN-only — silently ignore 403 for STAFF/OFFICE users
  const officesQuery = useQuery({
    queryKey: ['offices'],
    queryFn: getOffices,
    staleTime: 5 * 60 * 1000,
    enabled: user?.role === 'ADMIN',
    retry: false,
  });

  const overviewQuery = useQuery({
    queryKey: ['report-overview', year, selectedOfficeId || null],
    queryFn: () =>
      getReportOverview({
        year,
        ...(selectedOfficeId ? { officeId: selectedOfficeId } : {}),
      }),
    staleTime: 2 * 60 * 1000,
  });

  const summaryQuery = useQuery({
    queryKey: ['report-summary', year, selectedOfficeId || null],
    queryFn: () =>
      getReportSummary({
        year,
        ...(selectedOfficeId ? { officeId: selectedOfficeId } : {}),
      }),
    staleTime: 2 * 60 * 1000,
  });

  // For OFFICE users, the backend auto-fills officeId from their session token.
  // For ADMIN/STAFF, officeId must be explicitly selected.
  const missingQuery = useQuery({
    queryKey: ['report-missing', year, selectedOfficeId || (isOfficeUser ? '__own__' : null)],
    queryFn: () =>
      getNoUploadReport({
        year,
        ...(selectedOfficeId ? { officeId: selectedOfficeId } : {}),
      }),
    staleTime: 2 * 60 * 1000,
    enabled: Boolean(selectedOfficeId) || isOfficeUser,
  });

  const complianceQuery = useQuery({
    queryKey: ['report-compliance-progress', year, selectedOfficeId || null],
    queryFn: () =>
      getComplianceProgress({
        year,
        ...(selectedOfficeId ? { officeId: selectedOfficeId } : {}),
      }),
    staleTime: 2 * 60 * 1000,
  });

  // ── Derived: year / office lists ──────────────────────────────────────────────
  const yearOptions = useMemo(() => {
    const yrs = (yearsQuery.data?.years || []).map((y) => y.year).sort((a, b) => b - a);
    return yrs.length > 0 ? yrs : Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, [yearsQuery.data, currentYear]);

  const offices = useMemo(() => {
    // officesQuery only runs for ADMIN — data is { data: [...], total: N }
    const list = Array.isArray(officesQuery.data?.data) ? officesQuery.data.data : [];
    return list.filter((o) => o.is_active !== false);
  }, [officesQuery.data]);

  // For OFFICE-role users their office name comes from the auth token
  const selectedOfficeName = useMemo(
    () =>
      offices.find((o) => String(o.id) === selectedOfficeId)?.name ||
      (isOfficeUser ? (user?.office || 'Your Office') : ''),
    [offices, selectedOfficeId, isOfficeUser, user]
  );

  // ── Derived: summary stats ────────────────────────────────────────────────────
  const statusMap = useMemo(() => {
    const m = { PENDING: 0, APPROVED: 0, DENIED: 0, REVISION_REQUESTED: 0 };
    for (const row of summaryQuery.data?.breakdown || []) {
      if (m[row.status] !== undefined) m[row.status] = Number(row.count);
    }
    return m;
  }, [summaryQuery.data]);

  const total    = useMemo(() => Object.values(statusMap).reduce((a, b) => a + b, 0), [statusMap]);
  const reviewed = statusMap.APPROVED + statusMap.DENIED + statusMap.REVISION_REQUESTED;
  const approvalRate = reviewed > 0 ? ((statusMap.APPROVED / reviewed) * 100).toFixed(1) : null;

  const chartData = useMemo(
    () =>
      Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
        name: cfg.label,
        count: statusMap[key] ?? 0,
        fill: cfg.bar,
      })),
    [statusMap]
  );

  // ── Derived: overview ─────────────────────────────────────────────────────────
  const monthlyTrend = useMemo(() => {
    const raw = overviewQuery.data?.charts?.monthlySubmissionTrend || [];
    return MONTH_LABELS.map((name, i) => ({
      name,
      Submissions: raw.find((r) => r.month === i + 1)?.count || 0,
    }));
  }, [overviewQuery.data]);

  const complianceSnapshot = complianceQuery.data?.snapshot || null;
  const complianceMilestones = complianceSnapshot?.milestones || {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    UNDER_REVIEW: 0,
    COMPLIANT: 0,
  };
  const complianceMonthlyTrend = useMemo(() => {
    const rows = complianceQuery.data?.monthlyTrend || [];
    if (!rows.length) {
      return MONTH_LABELS.map((name) => ({ name, Completion: 0, Reviewed: 0, Total: 0 }));
    }
    return rows.map((row) => ({
      name: row.label,
      Completion: Number(row.completionPercentage || 0),
      Reviewed: Number(row.reviewed || 0),
      Total: Number(row.totalExpected || 0),
    }));
  }, [complianceQuery.data]);

  const topAreas = useMemo(
    () => overviewQuery.data?.charts?.topGovernanceAreas || [],
    [overviewQuery.data]
  );

  const recentSubmissions = useMemo(
    () => overviewQuery.data?.recentSubmissions || [],
    [overviewQuery.data]
  );

  // ── Derived: missing uploads ──────────────────────────────────────────────────
  const missingList = missingQuery.data?.missing || [];
  const missingByGov = useMemo(
    () =>
      missingList.reduce((acc, item) => {
        const key = item.governance_code;
        if (!acc[key])
          acc[key] = { name: item.governance_name, code: item.governance_code, items: [] };
        acc[key].items.push(item);
        return acc;
      }, {}),
    [missingList]
  );

  // ── "Generated at" text ───────────────────────────────────────────────────────
  const generatedAt = useMemo(() => {
    const ts =
      activeTab === 'overview' ? overviewQuery.dataUpdatedAt :
      activeTab === 'status'   ? complianceQuery.dataUpdatedAt  :
      activeTab === 'missing'  ? missingQuery.dataUpdatedAt  :
      null;
    return ts
      ? new Date(ts).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
      : null;
  }, [activeTab, overviewQuery.dataUpdatedAt, complianceQuery.dataUpdatedAt, missingQuery.dataUpdatedAt]);

  // ── Refresh ───────────────────────────────────────────────────────────────────
  const isRefreshing =
    overviewQuery.isFetching || summaryQuery.isFetching ||
    missingQuery.isFetching || complianceQuery.isFetching;

  const handleRefresh = () => {
    if (activeTab === 'overview') { overviewQuery.refetch(); summaryQuery.refetch(); }
    else if (activeTab === 'status') complianceQuery.refetch();
    else if (activeTab === 'missing') missingQuery.refetch();
  };

  // ── CSV exports ───────────────────────────────────────────────────────────────
  const exportSummaryCSV = () => {
    const officePart = selectedOfficeName || 'All Offices';
    const ctx = buildContextHeader('Submission Status Report', year, officePart);
    const header = 'Status,Count,Percentage\n';
    const body = Object.entries(STATUS_CONFIG)
      .map(([key, cfg]) => {
        const count = statusMap[key] ?? 0;
        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        return `"${cfg.label}",${count},${pct}%`;
      })
      .join('\n');
    const slug = selectedOfficeName ? toSlug(selectedOfficeName) : 'all-offices';
    downloadCSV(`submission-status-${slug}-${year}.csv`, ctx + header + body);
  };

  const exportMissingCSV = () => {
    if (!missingList.length) return;
    const officePart = selectedOfficeName || 'office';
    const ctx = buildContextHeader('Missing Uploads Report', year, officePart);
    const header = 'Governance Area,Governance Code,Item Code,Item Title\n';
    const body = missingList
      .map((r) => `"${r.governance_name}","${r.governance_code}","${r.item_code}","${r.item_title}"`)
      .join('\n');
    downloadCSV(`missing-uploads-${toSlug(officePart)}-${year}.csv`, ctx + header + body);
  };


  const exportRecentCSV = () => {
    if (!recentSubmissions.length) return;
    const ctx = buildContextHeader('Recent Submissions', year, selectedOfficeName || 'All Offices');
    const header = 'Office,Governance Area,Item Code,Item Title,Status,Submitted At\n';
    const body = recentSubmissions
      .map((r) =>
        `"${r.office_name}","${r.governance_code}","${r.item_code}","${r.item_title}","${r.status}","${new Date(r.submitted_at).toLocaleString('en-PH')}"`
      )
      .join('\n');
    downloadCSV(`recent-submissions-${year}.csv`, ctx + header + body);
  };

  const exportCompliance = async (format) => {
    try {
      const blob = await downloadComplianceProgress(
        {
          year,
          ...(selectedOfficeId ? { officeId: selectedOfficeId } : {}),
        },
        format
      );
      const officePart = selectedOfficeName ? toSlug(selectedOfficeName) : 'all-offices';
      downloadBlob(`compliance-progress-${officePart}-${year}.${format}`, blob);
      toast.success(`Compliance report exported (${format.toUpperCase()})`);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to export compliance report.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" data-tour-id="reports-root">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4" data-tour-id="reports-header">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Compliance progress and tracking insights for {year}
            {generatedAt && (
              <span className="ml-2 text-xs opacity-70">· Generated {generatedAt}</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" data-tour-id="reports-controls">
          <Select
            value={year}
            onValueChange={(v) => setYear(v)}
          >
            <SelectTrigger className="w-28 h-9">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Office filter — only shown for ADMIN (who can list offices) */}
          {!isOfficeUser && (
            <Select
              value={selectedOfficeId || 'all'}
              onValueChange={(v) => setSelectedOfficeId(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-52 h-9">
                <SelectValue placeholder="All Offices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Offices</SelectItem>
                {offices.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} data-tour-id="reports-tabs">
        <TabsList variant="line" className="w-full justify-start border-b pb-0 h-auto rounded-none gap-0">
          <TabsTrigger value="overview" data-tour-tab="overview" className="px-4 py-2.5">
            <Activity className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="status" data-tour-tab="status" className="px-4 py-2.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Compliance Progress
          </TabsTrigger>
          <TabsTrigger value="missing" data-tour-tab="missing" className="px-4 py-2.5">
            <FileX className="h-3.5 w-3.5" />
            Missing Uploads
          </TabsTrigger>
        </TabsList>

        {/* ══ TAB: Overview ════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6 mt-6">

          {/* KPI strip */}
          {overviewQuery.isFetching && !overviewQuery.data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-2">
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-7 bg-muted rounded w-1/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            (() => {
              const kpis = overviewQuery.data?.kpis || {};
              const t    = kpis.totalSubmissions    || 0;
              const app  = kpis.approvedSubmissions  || 0;
              const pen  = kpis.pendingSubmissions   || 0;
              const rev  = kpis.revisionRequestedSubmissions || 0;
              const den  = kpis.deniedSubmissions    || 0;
              const ar   = kpis.approvalRate != null ? `${kpis.approvalRate}%` : '—';
              const reviewed_ = kpis.reviewedSubmissions || 0;
              return (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" data-tour-id="reports-kpis">
                  <KpiCard label="Total" value={t.toLocaleString()} sub={`submissions in ${year}`} icon={FileText} color="text-foreground" bg="bg-muted" />
                  <KpiCard label="Approved"      value={app.toLocaleString()} sub={t > 0 ? `${((app/t)*100).toFixed(1)}% of total` : '—'} icon={CheckCircle2} color="text-green-600"  bg="bg-green-100"  accentBar="bg-green-500"  pct={t > 0 ? (app/t)*100 : 0} />
                  <KpiCard label="Pending"        value={pen.toLocaleString()} sub={t > 0 ? `${((pen/t)*100).toFixed(1)}% of total` : '—'} icon={Clock}        color="text-amber-600"  bg="bg-amber-100"  accentBar="bg-amber-400"  pct={t > 0 ? (pen/t)*100 : 0} />
                  <KpiCard label="Needs Revision" value={rev.toLocaleString()} sub={t > 0 ? `${((rev/t)*100).toFixed(1)}% of total` : '—'} icon={RotateCcw}    color="text-orange-600" bg="bg-orange-100" accentBar="bg-orange-500" pct={t > 0 ? (rev/t)*100 : 0} />
                  <KpiCard label="Denied"         value={den.toLocaleString()} sub={t > 0 ? `${((den/t)*100).toFixed(1)}% of total` : '—'} icon={XCircle}      color="text-red-600"    bg="bg-red-100"    accentBar="bg-red-500"    pct={t > 0 ? (den/t)*100 : 0} />
                  <KpiCard
                    label="Approval Rate"
                    value={ar}
                    sub={reviewed_ > 0 ? `of ${reviewed_} reviewed` : 'no reviewed yet'}
                    icon={TrendingUp}
                    color={kpis.approvalRate != null
                      ? (kpis.approvalRate >= 80 ? 'text-green-600' : kpis.approvalRate >= 50 ? 'text-amber-600' : 'text-red-600')
                      : 'text-muted-foreground'}
                    bg="bg-muted"
                    accentBar={kpis.approvalRate != null
                      ? (kpis.approvalRate >= 80 ? 'bg-green-500' : kpis.approvalRate >= 50 ? 'bg-amber-400' : 'bg-red-500')
                      : undefined}
                    pct={kpis.approvalRate ?? 0}
                  />
                </div>
              );
            })()
          )}

          {/* Monthly trend + Top areas */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Monthly Submission Trend
                </CardTitle>
                <CardDescription>Number of submissions per month in {year}</CardDescription>
              </CardHeader>
              <CardContent>
                {overviewQuery.isFetching && !overviewQuery.data ? (
                  <div className="flex items-center justify-center h-52 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-3" /> Loading…
                  </div>
                ) : monthlyTrend.every((m) => m.Submissions === 0) ? (
                  <EmptyState title="No submission data" sub={`No submissions recorded for ${year}.`} />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Line
                        type="monotone"
                        dataKey="Submissions"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#3b82f6' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Top Governance Areas</CardTitle>
                <CardDescription>Most submitted areas in {year}</CardDescription>
              </CardHeader>
              <CardContent>
                {overviewQuery.isFetching && !overviewQuery.data ? (
                  <LoadingRows n={5} />
                ) : topAreas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <div className="space-y-3">
                    {topAreas.map((area, i) => {
                      const max = topAreas[0]?.count || 1;
                      const pct = Math.round((area.count / max) * 100);
                      return (
                        <div key={area.governance_code} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                              <Badge variant="outline" className="font-mono text-xs">
                                {area.governance_code}
                              </Badge>
                              <span className="truncate max-w-[110px]">{area.governance_name}</span>
                            </div>
                            <span className="font-semibold text-xs shrink-0 ml-2">
                              {area.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-blue-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent submissions */}
          <Card data-tour-id="reports-recent">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Recent Submissions</CardTitle>
                <CardDescription>Last 10 submissions across all offices</CardDescription>
              </div>
              {recentSubmissions.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportRecentCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {overviewQuery.isFetching && !overviewQuery.data ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-3" /> Loading…
                </div>
              ) : recentSubmissions.length === 0 ? (
                <EmptyState title="No submissions yet" sub={`No records found for ${year}.`} />
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-2.5 text-left font-medium text-xs text-muted-foreground">Office</th>
                        <th className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground">Area</th>
                        <th className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground">Item</th>
                        <th className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground">Status</th>
                        <th className="px-6 py-2.5 text-right font-medium text-xs text-muted-foreground">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentSubmissions.map((r) => {
                        const cfg = STATUS_CONFIG[r.status];
                        return (
                          <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-2.5 font-medium">{r.office_name}</td>
                            <td className="px-3 py-2.5">
                              <Badge variant="outline" className="font-mono text-xs">
                                {r.governance_code}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">
                              {r.item_code && (
                                <span className="font-mono text-xs mr-1">{r.item_code}</span>
                              )}
                              {r.item_title}
                            </td>
                            <td className="px-3 py-2.5">
                              {cfg ? (
                                <Badge variant="outline" className={cn('text-xs', cfg.badge)}>
                                  {cfg.label}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">{r.status}</Badge>
                              )}
                            </td>
                            <td className="px-6 py-2.5 text-right text-xs text-muted-foreground">
                              {new Date(r.submitted_at).toLocaleDateString('en-PH', {
                                month: 'short', day: 'numeric', year: 'numeric',
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ TAB: Compliance Progress ═══════════════════════════════════════════ */}
        <TabsContent value="status" className="space-y-6 mt-6">
          {complianceQuery.isFetching && !complianceQuery.data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-2">
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-7 bg-muted rounded w-1/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                label="Total Expected"
                value={(complianceSnapshot?.totalExpected || 0).toLocaleString()}
                sub={`active compliance items in ${year}`}
                icon={FileText}
                color="text-foreground"
                bg="bg-muted"
              />
              <KpiCard
                label="Reviewed"
                value={(complianceSnapshot?.reviewed || 0).toLocaleString()}
                sub={`reviewed / expected in ${year}`}
                icon={ShieldCheck}
                color="text-blue-600"
                bg="bg-blue-100"
              />
              <KpiCard
                label="Compliant"
                value={(complianceMilestones.COMPLIANT || 0).toLocaleString()}
                sub={`${complianceSnapshot?.totalExpected ? ((complianceMilestones.COMPLIANT / complianceSnapshot.totalExpected) * 100).toFixed(1) : '0.0'}% of expected`}
                icon={CheckCircle2}
                color="text-green-600"
                bg="bg-green-100"
                accentBar="bg-green-500"
                pct={complianceSnapshot?.totalExpected ? (complianceMilestones.COMPLIANT / complianceSnapshot.totalExpected) * 100 : 0}
              />
              <KpiCard
                label="Under Review"
                value={(complianceMilestones.UNDER_REVIEW || 0).toLocaleString()}
                sub={`${complianceSnapshot?.totalExpected ? ((complianceMilestones.UNDER_REVIEW / complianceSnapshot.totalExpected) * 100).toFixed(1) : '0.0'}% of expected`}
                icon={RotateCcw}
                color="text-amber-600"
                bg="bg-amber-100"
                accentBar="bg-amber-400"
                pct={complianceSnapshot?.totalExpected ? (complianceMilestones.UNDER_REVIEW / complianceSnapshot.totalExpected) * 100 : 0}
              />
              <KpiCard
                label="In Progress"
                value={(complianceMilestones.IN_PROGRESS || 0).toLocaleString()}
                sub={`${complianceSnapshot?.totalExpected ? ((complianceMilestones.IN_PROGRESS / complianceSnapshot.totalExpected) * 100).toFixed(1) : '0.0'}% of expected`}
                icon={Clock}
                color="text-sky-600"
                bg="bg-sky-100"
                accentBar="bg-sky-500"
                pct={complianceSnapshot?.totalExpected ? (complianceMilestones.IN_PROGRESS / complianceSnapshot.totalExpected) * 100 : 0}
              />
              <KpiCard
                label="Overdue/Blocked"
                value={(complianceSnapshot?.overdueBlocked || 0).toLocaleString()}
                sub="past due and still unresolved"
                icon={TimerOff}
                color={(complianceSnapshot?.overdueBlocked || 0) > 0 ? 'text-red-600' : 'text-green-600'}
                bg={(complianceSnapshot?.overdueBlocked || 0) > 0 ? 'bg-red-100' : 'bg-green-100'}
              />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    Monthly Compliance Completion
                  </CardTitle>
                  <CardDescription>
                    Reviewed / expected by month for {year}
                    {selectedOfficeName ? ` — ${selectedOfficeName}` : ' — all offices'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportCompliance('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportCompliance('xlsx')}>
                    <Download className="h-4 w-4 mr-2" />
                    XLSX
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportCompliance('pdf')}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {complianceQuery.isFetching && !complianceQuery.data ? (
                  <div className="flex items-center justify-center h-52 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-3" /> Loading…
                  </div>
                ) : !complianceSnapshot?.totalExpected ? (
                  <EmptyState title="No compliance data found" sub="Try changing the year or office filter." />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={complianceMonthlyTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <RechartsTooltip
                        formatter={(v, name, ctx) => {
                          if (name === 'Completion') {
                            return [`${Number(v).toFixed(1)}% (${ctx?.payload?.Reviewed || 0}/${ctx?.payload?.Total || 0})`, 'Completion'];
                          }
                          return [v, name];
                        }}
                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Completion"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#2563eb' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Milestone Distribution</CardTitle>
                <CardDescription>Current compliance status counts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {complianceQuery.isFetching && !complianceQuery.data ? (
                  <LoadingRows n={4} />
                ) : !complianceSnapshot?.totalExpected ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  Object.entries(COMPLIANCE_STATUS_CONFIG).map(([key, cfg]) => {
                    const count = complianceMilestones[key] ?? 0;
                    const pct   = complianceSnapshot.totalExpected > 0 ? (count / complianceSnapshot.totalExpected) * 100 : 0;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2.5 w-2.5 rounded-full', cfg.bg)} />
                            <span>{cfg.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold">{count.toLocaleString()}</span>
                            <span className="text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: cfg.bar }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
                {!complianceQuery.isFetching && (complianceSnapshot?.totalExpected || 0) > 0 && (
                  <div className="pt-2 border-t flex justify-between text-xs text-muted-foreground">
                    <span>Completion percentage</span>
                    <span className="font-semibold text-foreground">{Number(complianceSnapshot?.completionPercentage || 0).toFixed(1)}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ TAB: Missing Uploads ══════════════════════════════════════════════ */}
        <TabsContent value="missing" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileX className="h-5 w-5 text-muted-foreground" />
                    Missing Uploads
                  </CardTitle>
                  <CardDescription>
                    {selectedOfficeName
                      ? `Checklist items with no submission for ${selectedOfficeName} in ${year}`
                      : 'Select an office from the filter above to view missing uploads'}
                  </CardDescription>
                </div>
                {missingList.length > 0 && (
                  <Button variant="outline" size="sm" onClick={exportMissingCSV} className="shrink-0">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* ADMIN/STAFF with no office selected yet */}
              {!isOfficeUser && !selectedOfficeId && (
                <EmptyState
                  icon={Building2}
                  title="Select an office above"
                  sub="The missing uploads report is per-office."
                />
              )}

              {/* Error state */}
              {(isOfficeUser || selectedOfficeId) && missingQuery.isError && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span className="flex-1">
                    {missingQuery.error?.response?.data?.message || 'Failed to load missing uploads.'}
                  </span>
                  <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => missingQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              )}

              {/* Loading */}
              {(isOfficeUser || selectedOfficeId) && missingQuery.isFetching && !missingQuery.isError && (
                <div className="flex items-center justify-center py-14 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-3" />
                  Loading missing uploads…
                </div>
              )}

              {/* All submitted */}
              {(isOfficeUser || selectedOfficeId) && !missingQuery.isFetching && !missingQuery.isError && missingQuery.data && missingList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 gap-2">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <p className="font-semibold text-green-700">All checklist items have been submitted!</p>
                  <p className="text-sm text-muted-foreground">
                    No missing uploads for {selectedOfficeName} in {year}.
                  </p>
                </div>
              )}

              {/* Missing items list */}
              {(isOfficeUser || selectedOfficeId) && !missingQuery.isFetching && !missingQuery.isError && missingList.length > 0 && (
                <div className="space-y-5">
                  {/* Summary banner */}
                  {(() => {
                    const totalLeaves = Object.values(missingByGov).reduce((sum, gov) => {
                      return sum + countLeaves(buildMissingTree(gov.items));
                    }, 0);
                    return (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                        <div className="flex-1">
                          <span className="font-semibold">{totalLeaves} missing item{totalLeaves !== 1 ? 's' : ''}</span>
                          {' '}across{' '}
                          <span className="font-semibold">{Object.keys(missingByGov).length}</span>
                          {' '}governance area{Object.keys(missingByGov).length !== 1 ? 's' : ''} for {selectedOfficeName}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Per-governance-area groups */}
                  <div className="space-y-4">
                    {Object.values(missingByGov).map((gov) => {
                      const tree      = buildMissingTree(gov.items);
                      const leafCount = countLeaves(tree);

                      function renderNodes(nodes, depth = 0) {
                        return nodes.map((node) => {
                          const indent = depth * 20;
                          if (node._isParent) {
                            return (
                              <React.Fragment key={node._code}>
                                <div
                                  className={cn(
                                    'flex items-center gap-3 px-4 py-2 border-b last:border-0',
                                    depth === 0 ? 'bg-muted/30' : 'bg-muted/10'
                                  )}
                                  style={{ paddingLeft: `${16 + indent}px` }}
                                >
                                  <span className="font-mono text-xs font-bold text-muted-foreground w-14 shrink-0">
                                    {node._code}
                                  </span>
                                  <span className={cn('text-sm font-semibold flex-1', depth > 0 && 'text-foreground/80')}>
                                    {node.item_title}
                                  </span>
                                </div>
                                {node.children.length > 0 && renderNodes(node.children, depth + 1)}
                              </React.Fragment>
                            );
                          }
                          return (
                            <div
                              key={node._code}
                              className="flex items-center gap-3 border-b last:border-0 hover:bg-muted/20 transition-colors py-2.5 pr-4"
                              style={{ paddingLeft: `${16 + indent}px` }}
                            >
                              {depth > 0 && (
                                <span aria-hidden className="text-muted-foreground/40 text-xs shrink-0">└</span>
                              )}
                              <span className="text-sm flex-1">{node.item_title}</span>
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                                No upload
                              </Badge>
                            </div>
                          );
                        });
                      }

                      return (
                        <div key={gov.code} className="rounded-lg border overflow-hidden">
                          <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b">
                            <Badge variant="outline" className="font-mono text-xs bg-purple-50 text-purple-800 border-purple-200 shrink-0">
                              {gov.code}
                            </Badge>
                            <span className="text-sm font-semibold flex-1">{gov.name}</span>
                            <span className="text-xs text-red-600 font-medium shrink-0">
                              {leafCount} missing
                            </span>
                          </div>
                          <div>{renderNodes(tree)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <HelpTourOverlay
        buttonLabel="Reports page help"
        steps={[
          {
            title: "Reports overview",
            description: "This page helps you analyze submissions, approval status, missing uploads, and office compliance rankings.",
            selector: '[data-tour-id="reports-header"]',
            selectorLabel: "Reports header",
          },
          {
            title: "Set report context",
            description: "Use year and office filters, then Refresh to load the latest report data before exporting or printing.",
            selector: '[data-tour-id="reports-controls"]',
            selectorLabel: "Year, office, and action controls",
          },
          {
            title: "Switch report modules",
            description: "Use these tabs to move between Overview, Submission Status, Missing Uploads, and Rankings.",
            selector: '[data-tour-id="reports-tabs"]',
            selectorLabel: "Report tabs",
            tabValue: "overview",
          },
          {
            title: "Read overview KPIs",
            description: "These KPI cards summarize total submissions, approvals, pending items, revisions, denials, and approval rate.",
            selector: '[data-tour-id="reports-kpis"]',
            selectorLabel: "Overview KPI cards",
            tabValue: "overview",
          },
          {
            title: "Review recent submissions",
            description: "Use this section to inspect the latest records and export recent submission data as CSV.",
            selector: '[data-tour-id="reports-recent"]',
            selectorLabel: "Recent submissions table",
            tabValue: "overview",
          },
          {
            title: "Analyze status distribution",
            description: "In Compliance Progress tab, analyze milestone counts, completion trend, and export executive reports.",
            selector: '[data-tour-tab="status"]',
            selectorLabel: "Compliance Progress tab",
            tabValue: "status",
          },
          {
            title: "Check missing uploads",
            description: "In Missing Uploads tab, identify checklist items with no file uploads and export office-specific gaps.",
            selector: '[data-tour-tab="missing"]',
            selectorLabel: "Missing Uploads tab",
            tabValue: "missing",
          },
        ]}
      />
    </div>
  );
}
