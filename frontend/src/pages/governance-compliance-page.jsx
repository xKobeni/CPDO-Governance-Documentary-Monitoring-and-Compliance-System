import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import { RefreshCw, CheckCircle2, Clock, XCircle, AlertCircle, MinusCircle, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { normalizeMatrixStatus, MATRIX_STATUSES } from '../lib/compliance-matrix-status';
import { getGovernanceAreas } from '../api/governance';
import { getOffices } from '../api/offices';
import { getComplianceMatrix } from '../api/governance';
import { getYears } from '../api/years';

// ─── Mock Data (removed — loaded from API) ───────────────────────────────────

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  APPROVED:            { label: 'Approved',          icon: CheckCircle2,  cell: 'bg-green-100 text-green-700',   badge: 'bg-green-100 text-green-700 border-green-200' },
  PENDING:             { label: 'Pending',            icon: Clock,         cell: 'bg-amber-50 text-amber-700',    badge: 'bg-amber-50 text-amber-700 border-amber-200'  },
  DENIED:              { label: 'Denied',             icon: XCircle,       cell: 'bg-red-100 text-red-700',       badge: 'bg-red-100 text-red-700 border-red-200'       },
  REVISION_REQUESTED:  { label: 'Needs Revision',     icon: AlertCircle,   cell: 'bg-orange-100 text-orange-700', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  IN_PROGRESS:         { label: 'In Progress',        icon: Clock,         cell: 'bg-sky-50 text-sky-700',        badge: 'bg-sky-50 text-sky-700 border-sky-200'        },
  NOT_STARTED:         { label: 'Not Started',        icon: MinusCircle,   cell: 'bg-muted/30 text-muted-foreground', badge: 'bg-muted text-muted-foreground border-border' },
};

function StatusCell({ status }) {
  const cfg = STATUS_CONFIG[normalizeMatrixStatus(status)] ?? STATUS_CONFIG.NOT_STARTED;
  const Icon = cfg.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('flex items-center justify-center rounded-md h-9 w-full cursor-default', cfg.cell)}>
          <Icon className="h-4 w-4" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{cfg.label}</TooltipContent>
    </Tooltip>
  );
}

function getOfficeStats(officeId, areas, matrixData) {
  const statuses = areas.map((a) => normalizeMatrixStatus(matrixData[a.id]?.[officeId]));
  return {
    approved:     statuses.filter((s) => s === MATRIX_STATUSES.APPROVED).length,
    pending:      statuses.filter((s) => s === MATRIX_STATUSES.PENDING || s === MATRIX_STATUSES.IN_PROGRESS).length,
    denied:       statuses.filter((s) => s === MATRIX_STATUSES.DENIED).length,
    revision:     statuses.filter((s) => s === MATRIX_STATUSES.REVISION_REQUESTED).length,
    notSubmitted: statuses.filter((s) => s === MATRIX_STATUSES.NOT_STARTED).length,
    total: statuses.length,
  };
}

function getAreaStats(areaId, offices, matrixData) {
  const statuses = offices.map((o) => normalizeMatrixStatus(matrixData[areaId]?.[o.id]));
  return {
    approved: statuses.filter((s) => s === MATRIX_STATUSES.APPROVED).length,
    total: statuses.length,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GovernanceCompliancePage() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [yearOptions, setYearOptions] = useState([]);
  const [focusOffice, setFocusOffice] = useState('all');
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);
  const [areas, setAreas] = useState([]);
  const [offices, setOffices] = useState([]);
  const [matrixData, setMatrixData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [areasRes, officesRes, matrixRes] = await Promise.all([
        getGovernanceAreas(),
        getOffices(),
        getComplianceMatrix(Number(year)),
      ]);

      const activeAreas   = (areasRes.governanceAreas || []).filter((a) => a.is_active);
      const officePayload = officesRes;
      const allOffices = Array.isArray(officePayload?.data)
        ? officePayload.data
        : Array.isArray(officePayload?.offices)
        ? officePayload.offices
        : [];
      const activeOffices = allOffices.filter((o) => o.is_active);

      // Build nested lookup: { areaId: { officeId: status } }
      const matrix = {};
      for (const cell of (matrixRes.cells || [])) {
        if (!matrix[cell.governance_area_id]) matrix[cell.governance_area_id] = {};
        matrix[cell.governance_area_id][cell.office_id] = normalizeMatrixStatus(cell.status);
      }

      setAreas(activeAreas);
      setOffices(activeOffices);
      setMatrixData(matrix);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load compliance data.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  // Load managed years for dropdown (with fallback)
  useEffect(() => {
    getYears({ includeInactive: false })
      .then((res) => {
        const yrs = (res.years || []).map((y) => y.year).sort((a, b) => b - a);
        if (yrs.length > 0) {
          setYearOptions(yrs);
          if (!yrs.includes(Number(year))) {
            setYear(String(yrs[0]));
          }
        } else {
          setYearOptions([currentYear, currentYear - 1, currentYear - 2]);
        }
      })
      .catch(() => {
        setYearOptions([currentYear, currentYear - 1, currentYear - 2]);
      });
  }, [currentYear, year]);

  const handleExport = () => {
    const activeAreas = areas;
    const activeOffices = offices;
    const rows = [];
    rows.push(["Governance Area", ...activeOffices.map((o) => o.code)].join(","));
    for (const a of activeAreas) {
      const line = [a.code, ...activeOffices.map((o) => normalizeMatrixStatus(matrixData[a.id]?.[o.id]))];
      rows.push(line.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
    }
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-matrix-${year}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { loadData(); }, [loadData]);

  const totalCells = areas.length * offices.length;
  // Flatten all matrix statuses for summary counters
  const allCellStatuses = Object.values(matrixData).flatMap((row) =>
    Object.values(row || {}).map((s) => normalizeMatrixStatus(s))
  );
  const approvedCells = allCellStatuses.filter((s) => s === MATRIX_STATUSES.APPROVED).length;
  const overallPct = totalCells > 0 ? Math.round((approvedCells / totalCells) * 100) : 0;
  const statusKpis = [
    { status: 'APPROVED',           count: approvedCells },
    { status: 'PENDING',            count: allCellStatuses.filter((s) => s === MATRIX_STATUSES.PENDING).length },
    { status: 'IN_PROGRESS',        count: allCellStatuses.filter((s) => s === MATRIX_STATUSES.IN_PROGRESS).length },
    { status: 'REVISION_REQUESTED', count: allCellStatuses.filter((s) => s === MATRIX_STATUSES.REVISION_REQUESTED).length },
    { status: 'DENIED',             count: allCellStatuses.filter((s) => s === MATRIX_STATUSES.DENIED).length },
    {
      status: 'NOT_STARTED',
      count:
        Math.max(totalCells - allCellStatuses.length, 0) +
        allCellStatuses.filter((s) => s === MATRIX_STATUSES.NOT_STARTED).length,
    },
  ];

  const visibleAreas = showAtRiskOnly
    ? areas.filter((a) => { const s = getAreaStats(a.id, offices, matrixData); return Math.round((s.approved / (s.total || 1)) * 100) < 80; })
    : areas;

  return (
    <TooltipProvider>
    <div className="space-y-6">

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
          <span>{error}</span>
          <button className="ml-auto text-red-500 hover:text-red-700" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Matrix</h1>
          <p className="text-muted-foreground">
            See which offices have submitted and been approved for each governance area
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Export</Button>
        </div>
      </div>

      {/* ── Overall Progress Banner ─────────────────────────────────────────── */}
      <Card className={cn('border-l-4', overallPct >= 80 ? 'border-l-green-500' : overallPct >= 50 ? 'border-l-amber-400' : 'border-l-red-500')}>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between mb-1.5">
                <div>
                  <span className="text-sm font-semibold">Overall Compliance — {year}</span>
                  <span className="text-xs text-muted-foreground ml-2">{approvedCells} of {totalCells} area-office combinations approved</span>
                </div>
                <span className={cn('text-xl font-bold', overallPct >= 80 ? 'text-green-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-600')}>
                  {overallPct}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={cn('h-3 rounded-full transition-all', overallPct >= 80 ? 'bg-green-500' : overallPct >= 50 ? 'bg-amber-400' : 'bg-red-500')}
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Focus office:</span>
          <Select value={focusOffice} onValueChange={setFocusOffice}>
            <SelectTrigger className="w-[180px] h-8 text-sm"><SelectValue placeholder="All offices" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All offices</SelectItem>
              {offices.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.code} — {o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant={showAtRiskOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowAtRiskOnly(!showAtRiskOnly)}
          className={showAtRiskOnly ? 'bg-amber-500 hover:bg-amber-600 border-amber-500' : ''}
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          {showAtRiskOnly ? 'Showing Needs Attention' : 'Show Needs Attention'}
        </Button>
        {(focusOffice !== 'all' || showAtRiskOnly) && (
          <Button variant="ghost" size="sm" onClick={() => { setFocusOffice('all'); setShowAtRiskOnly(false); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {statusKpis.map(({ status, count }) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <div key={status} className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border', cfg.badge)}>
              <Icon className="h-3.5 w-3.5" />
              <span>{count} {cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* ── Matrix Table ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Compliance Status — {year}</span>
            {showAtRiskOnly && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Showing {visibleAreas.length} areas needing attention</Badge>}
          </CardTitle>
          <CardDescription>
            Rows = governance areas · Columns = offices · Click the blue review button on any row to manage submissions
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="sticky left-0 bg-muted/40 z-10 px-4 py-3 text-left font-semibold min-w-[200px]">
                  Governance Area
                </th>
                {offices.map((o) => {
                  const stats = getOfficeStats(o.id, areas, matrixData);
                  const isFocused = focusOffice === o.id;
                  const isDimmed  = focusOffice !== 'all' && !isFocused;
                  return (
                    <th
                      key={o.code}
                      className={cn('px-3 py-3 text-center font-medium min-w-[100px] transition-opacity cursor-pointer', isDimmed && 'opacity-30')}
                      onClick={() => setFocusOffice(focusOffice === o.id ? 'all' : o.id)}
                    >
                      <div className={cn('font-semibold', isFocused && 'text-primary underline')}>{o.code}</div>
                      <div className="text-[10px] text-muted-foreground font-normal truncate max-w-[90px] mx-auto" title={o.name}>
                        {o.name}
                      </div>
                      <div className="text-[10px] text-green-600 font-medium mt-0.5">
                        {stats.approved}/{stats.total} ✓
                      </div>
                    </th>
                  );
                })}
                <th className="px-3 py-3 text-center font-medium min-w-[90px]">Row Progress</th>
                <th className="px-3 py-3 text-center font-medium min-w-[90px]">Review</th>
              </tr>
            </thead>
            <tbody>
              {visibleAreas.map((area, aIdx) => {
                const areaStats = getAreaStats(area.id, offices, matrixData);
                const pct = areaStats.total > 0 ? Math.round((areaStats.approved / areaStats.total) * 100) : 0;
                const barColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500';
                const pctText  = pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700';
                return (
                  <tr
                    key={area.code}
                    className={cn('border-b transition-colors hover:bg-muted/20', aIdx % 2 === 0 ? '' : 'bg-muted/10')}
                  >
                    <td className="sticky left-0 bg-background z-10 px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs shrink-0">{area.code}</Badge>
                        <span className="text-sm font-medium truncate max-w-[140px]" title={area.name}>{area.name}</span>
                      </div>
                    </td>
                    {offices.map((o) => {
                      const isFocused = focusOffice === o.id;
                      const isDimmed  = focusOffice !== 'all' && !isFocused;
                      return (
                        <td key={o.id} className={cn('px-2 py-2 transition-opacity', isDimmed && 'opacity-20')}>
                          <StatusCell status={matrixData[area.id]?.[o.id]} />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      <div className={cn('text-sm font-bold', pctText)}>{pct}%</div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div className={cn('h-2 rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{areaStats.approved}/{areaStats.total}</div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => navigate(`/submissions?governanceAreaId=${area.id}&year=${year}`)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/30 font-semibold">
                <td className="sticky left-0 bg-muted/30 z-10 px-4 py-2 text-sm font-semibold">Column Total</td>
                {offices.map((o) => {
                  const stats   = getOfficeStats(o.id, areas, matrixData);
                  const pct     = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
                  const isDimmed = focusOffice !== 'all' && focusOffice !== o.id;
                  return (
                    <td key={o.id} className={cn('px-2 py-2 text-center transition-opacity', isDimmed && 'opacity-30')}>
                      <div className={cn('text-sm font-bold', pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700')}>{pct}%</div>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1 mx-auto max-w-[60px]">
                        <div className={cn('h-1.5 rounded-full', pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500')} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center">
                  <div className={cn('text-sm font-bold', overallPct >= 80 ? 'text-green-700' : overallPct >= 50 ? 'text-amber-700' : 'text-red-700')}>{overallPct}%</div>
                </td>
                <td className="px-3 py-2 text-center" />
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* ── Per-Office Summary Cards ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Office Summary</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offices.map((o) => {
            const stats = getOfficeStats(o.id, areas, matrixData);
            const pct = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
            return (
              <Card key={o.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge variant="outline" className="font-mono text-xs mb-1">{o.code}</Badge>
                      <p className="text-sm font-medium">{o.name}</p>
                    </div>
                    <span className={cn(
                      'text-lg font-bold',
                      pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
                    )}>{pct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mb-3">
                    <div
                      className={cn('h-2 rounded-full transition-all', pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="text-green-700 bg-green-50 rounded px-1.5 py-0.5 border border-green-200">{stats.approved} approved</span>
                    <span className="text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200">{stats.pending} pending</span>
                    {stats.denied > 0 && <span className="text-red-700 bg-red-50 rounded px-1.5 py-0.5 border border-red-200">{stats.denied} denied</span>}
                    {stats.revision > 0 && <span className="text-orange-700 bg-orange-50 rounded px-1.5 py-0.5 border border-orange-200">{stats.revision} revision</span>}
                    {stats.notSubmitted > 0 && <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 border">{stats.notSubmitted} missing</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

    </div>
    </TooltipProvider>
  );
}
