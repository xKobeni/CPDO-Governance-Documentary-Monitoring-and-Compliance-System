import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Search, ShieldCheck, RefreshCw, ArrowRight, FileText, ClipboardList,
  TrendingUp, AlertTriangle, CheckCircle2, MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { cn } from '../lib/utils';
import { getGovernanceAreasWithStats } from '../api/governance';

// ─── Mock Data ────────────────────────────────────────────────────────────────
// (removed — areas are loaded from the backend API)

const CARD_ACCENTS = [
  'border-l-blue-500', 'border-l-violet-500', 'border-l-emerald-500', 'border-l-amber-500',
  'border-l-slate-400', 'border-l-cyan-500', 'border-l-orange-500', 'border-l-indigo-500',
  'border-l-slate-400', 'border-l-rose-500',
];

// Returns color classes based on compliance %, with a label
function healthInfo(pct) {
  if (pct >= 80) return { bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  label: 'On Track' };
  if (pct >= 50) return { bar: 'bg-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50',  label: 'Needs Attention' };
  return             { bar: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    label: 'At Risk' };
}

export default function GovernanceAllPage() {
  const navigate = useNavigate();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');

  const loadAreas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGovernanceAreasWithStats(year);
      setAreas(data.governanceAreas);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load governance areas.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { loadAreas(); }, [loadAreas]);

  const filtered = areas.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && a.is_active) ||
      (statusFilter === 'inactive' && !a.is_active);
    const pct = a.offices_total > 0 ? Math.round((a.offices_compliant / a.offices_total) * 100) : 0;
    const matchHealth =
      healthFilter === 'all' ||
      (healthFilter === 'on-track'  && pct >= 80) ||
      (healthFilter === 'attention' && pct >= 50 && pct < 80) ||
      (healthFilter === 'at-risk'   && pct < 50);
    return matchSearch && matchStatus && matchHealth;
  });

  const totalActive      = areas.filter((a) => a.is_active).length;
  const totalSubmissions = areas.reduce((s, a) => s + (a.submissions || 0), 0);
  const totalTemplates   = areas.reduce((s, a) => s + (a.templates || 0), 0);
  const atRiskCount      = areas.filter((a) => a.is_active && a.offices_total > 0 && (a.offices_compliant / a.offices_total) < 0.5).length;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Governance Areas</h1>
          <p className="text-muted-foreground">
            Overview of all compliance areas — click any card to see office-by-office status
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAreas} disabled={loading}>
          {loading
            ? <><svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Loading…</>
            : <><RefreshCw className="mr-2 h-4 w-4" />Refresh</>}
        </Button>
      </div>

      {/* ── Summary Strip ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Areas</CardTitle>
            <MapPin className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActive}</div>
            <p className="text-xs text-muted-foreground mt-1">of {areas.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checklist Templates</CardTitle>
            <FileText className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTemplates}</div>
            <p className="text-xs text-muted-foreground mt-1">across active areas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <ClipboardList className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground mt-1">for 2026</p>
          </CardContent>
        </Card>
        <Card className={atRiskCount > 0 ? 'border-red-200 bg-red-50/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className={cn('h-4 w-4', atRiskCount > 0 ? 'text-red-500' : 'text-muted-foreground')} />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', atRiskCount > 0 ? 'text-red-600' : '')}>{atRiskCount}</div>
            <p className="text-xs text-muted-foreground mt-1">areas below 50% compliance</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by code, name, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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

      {/* ── Cards Grid ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading governance areas…</div>
      ) : error ? (
        <div className="text-center py-16 text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No governance areas match your filters.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((area) => {
            const pct     = area.is_active && area.offices_total > 0 ? Math.round((area.offices_compliant / area.offices_total) * 100) : null;
            const health  = pct !== null ? healthInfo(pct) : null;
            return (
              <Card
                key={area.id}
                className={cn(
                  'border-l-4 transition-all hover:shadow-md cursor-pointer group',
                  area.is_active ? CARD_ACCENTS[area.sort_order - 1] : 'border-l-slate-300 opacity-55'
                )}
                onClick={() => navigate('/governance/manage')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">{area.code}</Badge>
                      {!area.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                      {health && (
                        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', health.bg, health.text)}>
                          {health.label}
                        </span>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <CardTitle className="text-base leading-snug mt-1">{area.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {area.description}
                  </p>

                  {area.is_active ? (
                    <>
                      {/* Compliance progress bar */}
                      {pct !== null && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Office compliance</span>
                            <span className={cn('font-semibold', health?.text)}>{area.offices_compliant}/{area.offices_total} offices — {pct}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={cn('h-2 rounded-full transition-all', health?.bar)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {/* Mini stats */}
                      <div className="flex gap-4 pt-1 border-t text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Templates</p>
                          <p className="text-sm font-semibold">{area.templates}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Submissions</p>
                          <p className="text-sm font-semibold">{area.submissions}</p>
                        </div>
                        <div className="ml-auto self-center">
                          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Manage area →</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pt-1 border-t">No active templates — this area is not yet tracked.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
