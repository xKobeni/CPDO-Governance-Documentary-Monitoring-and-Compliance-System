import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
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
  ShieldCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { getReportSummary, getNoUploadReport } from '../api/reports';
import { getYears } from '../api/years';
import { getOffices } from '../api/offices';

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  APPROVED:           { label: 'Approved',           icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-100',  bar: '#22c55e', badge: 'bg-green-100 text-green-700 border-green-200' },
  PENDING:            { label: 'Pending',             icon: Clock,        color: 'text-amber-600',  bg: 'bg-amber-100',  bar: '#f59e0b', badge: 'bg-amber-100 text-amber-700 border-amber-200'  },
  REVISION_REQUESTED: { label: 'Needs Revision',      icon: RotateCcw,    color: 'text-orange-600', bg: 'bg-orange-100', bar: '#f97316', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  DENIED:             { label: 'Denied',              icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-100',    bar: '#ef4444', badge: 'bg-red-100 text-red-700 border-red-200'         },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, bg, accentBar, pct }) {
  return (
    <Card className="relative overflow-hidden">
      {accentBar && (
        <div className={cn('absolute bottom-0 left-0 h-1 transition-all', accentBar)} style={{ width: `${pct ?? 0}%` }} />
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [yearOptions, setYearOptions] = useState([]);
  const [offices, setOffices] = useState([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [missingUploads, setMissingUploads] = useState(null);
  const [missingLoading, setMissingLoading] = useState(false);

  // Load offices and years on mount
  useEffect(() => {
    getOffices()
      .then((res) => {
        const raw = res?.data ?? res;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.offices) ? raw.offices : [];
        setOffices(list.filter((o) => o.is_active !== false));
      })
      .catch(() => toast.error('Failed to load offices'));

    getYears({ includeInactive: false })
      .then((res) => {
        const yrs = (res.years || []).map((y) => y.year).sort((a, b) => b - a);
        if (yrs.length > 0) {
          setYearOptions(yrs);
          if (!yrs.includes(Number(year))) setYear(String(yrs[0]));
        } else {
          setYearOptions(Array.from({ length: 6 }, (_, i) => currentYear - i));
        }
      })
      .catch(() => setYearOptions(Array.from({ length: 6 }, (_, i) => currentYear - i)));
  }, []);

  // ── Summary ──────────────────────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const params = { year };
      if (selectedOfficeId) params.officeId = selectedOfficeId;
      const data = await getReportSummary(params);
      setSummary(data);
    } catch {
      toast.error('Failed to load summary report');
    } finally {
      setSummaryLoading(false);
    }
  }, [year, selectedOfficeId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // ── Missing uploads — auto-load when office / year changes ──────────────────
  const loadMissingUploads = useCallback(async () => {
    if (!selectedOfficeId) return;
    setMissingLoading(true);
    try {
      const data = await getNoUploadReport({ year, officeId: selectedOfficeId });
      setMissingUploads(data);
    } catch {
      toast.error('Failed to load missing uploads report');
    } finally {
      setMissingLoading(false);
    }
  }, [year, selectedOfficeId]);

  useEffect(() => {
    if (selectedOfficeId) {
      setMissingUploads(null);
      loadMissingUploads();
    } else {
      setMissingUploads(null);
    }
  }, [selectedOfficeId, year]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const breakdown = summary?.breakdown || [];
  const statusMap = { PENDING: 0, APPROVED: 0, DENIED: 0, REVISION_REQUESTED: 0 };
  for (const row of breakdown) {
    if (statusMap[row.status] !== undefined) statusMap[row.status] = Number(row.count);
  }
  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const reviewed = statusMap.APPROVED + statusMap.DENIED + statusMap.REVISION_REQUESTED;
  const approvalRate = reviewed > 0 ? ((statusMap.APPROVED / reviewed) * 100).toFixed(1) : null;

  const chartData = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    name: cfg.label,
    count: statusMap[key] ?? 0,
    fill: cfg.bar,
  }));

  // Group missing uploads by governance area and build a parent-child tree
  const missingList = missingUploads?.missing || [];

  // Build a tree from the flat list using item_code hierarchy (e.g. "1", "1.a", "1.a.1")
  function buildMissingTree(items) {
    const sorted = [...items].sort((a, b) =>
      String(a.item_code || '').localeCompare(String(b.item_code || ''), undefined, { numeric: true })
    );

    const nodeMap = {};
    for (const item of sorted) {
      const code = String(item.item_code || item.checklist_item_id);
      nodeMap[code] = { ...item, _code: code, children: [] };
    }

    // An item is a parent if any other item's code starts with this code + "."
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
        if (nodeMap[parentCode]) {
          nodeMap[parentCode].children.push(node);
        } else {
          roots.push(node);
        }
      }
    }
    return roots;
  }

  const missingByGov = missingList.reduce((acc, item) => {
    const key = item.governance_code;
    if (!acc[key]) acc[key] = { name: item.governance_name, code: item.governance_code, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});

  // Count only leaf (actual submittable) missing items per governance area
  function countLeaves(nodes) {
    let n = 0;
    for (const node of nodes) {
      if (node._isParent) n += countLeaves(node.children);
      else n++;
    }
    return n;
  }

  const selectedOfficeName = offices.find((o) => String(o.id) === selectedOfficeId)?.name || '';

  const exportMissingCSV = () => {
    if (!missingList.length) return;
    const header = 'Governance Area,Governance Code,Item Code,Item Title\n';
    const body = missingList
      .map((r) => `"${r.governance_name}","${r.governance_code}","${r.item_code}","${r.item_title}"`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `missing-uploads-${selectedOfficeId}-${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportSummaryCSV = () => {
    const header = 'Status,Count,Percentage\n';
    const body = Object.entries(STATUS_CONFIG)
      .map(([key, cfg]) => {
        const count = statusMap[key] ?? 0;
        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        return `"${cfg.label}",${count},${pct}%`;
      })
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `submission-summary-${year}${selectedOfficeId ? `-${selectedOfficeId}` : ''}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Submission statistics and compliance tracking for {year}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={year} onValueChange={(v) => { setYear(v); setMissingUploads(null); }}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedOfficeId || 'all'} onValueChange={(v) => setSelectedOfficeId(v === 'all' ? '' : v)}>
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
          <Button variant="outline" size="sm" onClick={() => { loadSummary(); if (selectedOfficeId) loadMissingUploads(); }} disabled={summaryLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', summaryLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      {summaryLoading ? (
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
          <KpiCard label="Total" value={total.toLocaleString()} sub={`submissions in ${year}`} icon={FileText} color="text-foreground" bg="bg-muted" />
          <KpiCard label="Approved" value={statusMap.APPROVED.toLocaleString()} sub={total > 0 ? `${((statusMap.APPROVED/total)*100).toFixed(1)}% of total` : '—'} icon={CheckCircle2} color="text-green-600" bg="bg-green-100" accentBar="bg-green-500" pct={total > 0 ? (statusMap.APPROVED/total)*100 : 0} />
          <KpiCard label="Pending" value={statusMap.PENDING.toLocaleString()} sub={total > 0 ? `${((statusMap.PENDING/total)*100).toFixed(1)}% of total` : '—'} icon={Clock} color="text-amber-600" bg="bg-amber-100" accentBar="bg-amber-400" pct={total > 0 ? (statusMap.PENDING/total)*100 : 0} />
          <KpiCard label="Needs Revision" value={statusMap.REVISION_REQUESTED.toLocaleString()} sub={total > 0 ? `${((statusMap.REVISION_REQUESTED/total)*100).toFixed(1)}% of total` : '—'} icon={RotateCcw} color="text-orange-600" bg="bg-orange-100" accentBar="bg-orange-500" pct={total > 0 ? (statusMap.REVISION_REQUESTED/total)*100 : 0} />
          <KpiCard label="Denied" value={statusMap.DENIED.toLocaleString()} sub={total > 0 ? `${((statusMap.DENIED/total)*100).toFixed(1)}% of total` : '—'} icon={XCircle} color="text-red-600" bg="bg-red-100" accentBar="bg-red-500" pct={total > 0 ? (statusMap.DENIED/total)*100 : 0} />
          <KpiCard
            label="Approval Rate"
            value={approvalRate !== null ? `${approvalRate}%` : '—'}
            sub={approvalRate !== null ? `of ${reviewed} reviewed` : 'no reviewed yet'}
            icon={TrendingUp}
            color={approvalRate !== null ? (Number(approvalRate) >= 80 ? 'text-green-600' : Number(approvalRate) >= 50 ? 'text-amber-600' : 'text-red-600') : 'text-muted-foreground'}
            bg="bg-muted"
            accentBar={approvalRate !== null ? (Number(approvalRate) >= 80 ? 'bg-green-500' : Number(approvalRate) >= 50 ? 'bg-amber-400' : 'bg-red-500') : undefined}
            pct={approvalRate ? Number(approvalRate) : 0}
          />
        </div>
      )}

      {/* ── Section 1: Submission Status ──────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Bar chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                Submission Status Breakdown
              </CardTitle>
              <CardDescription>
                Distribution for {year}{selectedOfficeName ? ` — ${selectedOfficeName}` : ' — all offices'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportSummaryCSV} disabled={total === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="flex items-center justify-center h-52 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-3" /> Loading…
              </div>
            ) : total === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-muted-foreground gap-2">
                <AlertCircle className="h-8 w-8 opacity-40" />
                <p className="text-sm">No submissions found for the selected filters.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip
                    formatter={(v, n) => [v, n]}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" name="Submissions" radius={[4, 4, 0, 0]} maxBarSize={52}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Distribution rows */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
            <CardDescription>Proportion of each status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {summaryLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-1.5">
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-2 bg-muted rounded w-full" />
                  </div>
                ))}
              </div>
            ) : total === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            ) : (
              Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = statusMap[key] ?? 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                const Icon = cfg.icon;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-3.5 w-3.5 shrink-0', cfg.color)} />
                        <span>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold">{count.toLocaleString()}</span>
                        <span className="text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.bar }} />
                    </div>
                  </div>
                );
              })
            )}
            {!summaryLoading && total > 0 && (
              <div className="pt-2 border-t flex justify-between text-xs text-muted-foreground">
                <span>Total submissions</span>
                <span className="font-semibold text-foreground">{total.toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Section 2: Missing Uploads ───────────────────────────────────────── */}
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
                  : 'Select an office above to view missing uploads'}
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
          {/* No office selected */}
          {!selectedOfficeId && (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
              <Building2 className="h-10 w-10 opacity-30" />
              <p className="font-medium">Select an office above</p>
              <p className="text-sm">The missing uploads report is per-office.</p>
            </div>
          )}

          {/* Loading */}
          {selectedOfficeId && missingLoading && (
            <div className="flex items-center justify-center py-14 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-3" />
              Loading missing uploads…
            </div>
          )}

          {/* All submitted */}
          {selectedOfficeId && !missingLoading && missingUploads && missingList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 gap-2">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="font-semibold text-green-700">All checklist items have been submitted!</p>
              <p className="text-sm text-muted-foreground">No missing uploads for {selectedOfficeName} in {year}.</p>
            </div>
          )}

          {/* Missing items list */}
          {selectedOfficeId && !missingLoading && missingUploads && missingList.length > 0 && (
            <div className="space-y-5">
              {/* Summary banner — leaf items only */}
              {(() => {
                const totalLeaves = Object.values(missingByGov).reduce((sum, gov) => {
                  const tree = buildMissingTree(gov.items);
                  return sum + countLeaves(tree);
                }, 0);
                return (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <div className="flex-1">
                      <span className="font-semibold">{totalLeaves} missing item{totalLeaves !== 1 ? 's' : ''}</span>
                      {' '}across <span className="font-semibold">{Object.keys(missingByGov).length}</span> governance area{Object.keys(missingByGov).length !== 1 ? 's' : ''} for {selectedOfficeName}
                    </div>
                  </div>
                );
              })()}

              {/* Progress bar */}
              {summary && (
                (() => {
                  const submittedCount = total;
                  const combinedTotal = submittedCount + missingList.length;
                  const pct = combinedTotal > 0 ? Math.round((submittedCount / combinedTotal) * 100) : 0;
                  return (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Submission coverage</span>
                        <span className="font-semibold text-foreground">{submittedCount} submitted · {missingList.length} missing</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <p className="text-xs text-muted-foreground">{pct}% of checklist items have at least one submission</p>
                    </div>
                  );
                })()
              )}

              {/* Per-governance-area groups with tree */}
              <div className="space-y-4">
                {Object.values(missingByGov).map((gov) => {
                  const tree = buildMissingTree(gov.items);
                  const leafCount = countLeaves(tree);

                  function renderNodes(nodes, depth = 0) {
                    return nodes.map((node) => {
                      const indent = depth * 20;
                      if (node._isParent) {
                        return (
                          <React.Fragment key={node._code}>
                            {/* Section header row — no status badge */}
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
                              <span className={cn('text-sm font-semibold flex-1', depth === 0 ? '' : 'text-foreground/80')}>
                                {node.item_title}
                              </span>
                            </div>
                            {/* Children */}
                            {node.children.length > 0 && renderNodes(node.children, depth + 1)}
                          </React.Fragment>
                        );
                      }
                      // Leaf row — actual missing submission item (no code shown)
                      return (
                        <div
                          key={node._code}
                          className="flex items-center gap-3 border-b last:border-0 hover:bg-muted/20 transition-colors py-2.5 pr-4"
                          style={{ paddingLeft: `${16 + indent}px` }}
                        >
                          {depth > 0 && (
                            <span aria-hidden="true" className="text-muted-foreground/40 text-xs shrink-0">└</span>
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
                      {/* Governance area header */}
                      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b">
                        <Badge variant="outline" className="font-mono text-xs bg-purple-50 text-purple-800 border-purple-200 shrink-0">
                          {gov.code}
                        </Badge>
                        <span className="text-sm font-semibold flex-1">{gov.name}</span>
                        <span className="text-xs text-red-600 font-medium shrink-0">
                          {leafCount} missing
                        </span>
                      </div>
                      {/* Tree rows */}
                      <div className="divide-y-0">
                        {renderNodes(tree)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
