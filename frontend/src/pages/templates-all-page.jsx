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
import { Search, RefreshCw, FileText, ClipboardList, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { cn } from '../lib/utils';
import { getAllTemplates } from '../api/templates';
import { getYears } from '../api/years';

const STATUS_STYLE = {
  ACTIVE:   'bg-green-100 text-green-700 border-green-200',
  DRAFT:    'bg-amber-50 text-amber-700 border-amber-200',
  ARCHIVED: 'bg-muted text-muted-foreground border-border',
};

export default function TemplatesAllPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [yearFilter, setYearFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [yearOptions, setYearOptions]   = useState([]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllTemplates();
      setTemplates(data.templates ?? []);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to load templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  useEffect(() => {
    const derivedYears = [...new Set(templates.map((t) => t.year))].sort((a, b) => b - a);
    getYears({ includeInactive: false })
      .then((res) => {
        const managed = (res.years || []).map((y) => y.year).sort((a, b) => b - a);
        if (managed.length > 0) {
          setYearOptions(managed);
        } else {
          setYearOptions(derivedYears);
        }
      })
      .catch(() => {
        setYearOptions(derivedYears);
      });
  }, [templates]);

  const years = yearOptions;

  const filtered = templates.filter((t) => {
    const matchYear   = yearFilter === 'all' || String(t.year) === yearFilter;
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.governance_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.governance_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchYear && matchStatus && matchSearch;
  });

  const total      = templates.length;
  const active     = templates.filter((t) => t.status === 'ACTIVE').length;
  const draft      = templates.filter((t) => t.status === 'DRAFT').length;
  const totalItems = templates.reduce((s, t) => s + (t.item_count ?? 0), 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Templates</h1>
          <p className="text-muted-foreground">Overview of all governance compliance templates</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTemplates} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button className="text-red-500 hover:text-red-700" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '—' : total}</div>
            <p className="text-xs text-muted-foreground mt-1">across all years</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '—' : active}</div>
            <p className="text-xs text-muted-foreground mt-1">in use this year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '—' : draft}</div>
            <p className="text-xs text-muted-foreground mt-1">not yet published</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checklist Items</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '—' : totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">across all templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by title or governance area..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading templates…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No templates match your filters.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card
              key={t.id}
              className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/templates/manage')}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="font-mono text-xs">{t.governance_code}</Badge>
                    <Badge className={cn('text-xs border', STATUS_STYLE[t.status])}>{t.status}</Badge>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </div>
                <CardTitle className="text-sm font-semibold leading-snug mt-1">{t.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{t.governance_name} · {t.year}</p>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {t.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.notes}</p>
                )}
                <div className="flex items-center gap-1 pt-1 border-t">
                  <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t.item_count ?? 0} checklist items</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

