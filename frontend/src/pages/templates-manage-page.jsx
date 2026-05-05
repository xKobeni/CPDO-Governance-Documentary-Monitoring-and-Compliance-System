import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Search, Plus, MoreVertical, Edit, Trash2, FileText, ClipboardList,
  CheckCircle, Archive, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, Loader2, Copy,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getAllTemplates, createTemplate, updateTemplate, deleteTemplate, copyTemplate } from '../api/templates';
import { getYears } from '../api/years';
import { getGovernanceAreas } from '../api/governance';
import HelpTourOverlay from '../components/help-tour-overlay';

const STATUS_STYLE = {
  ACTIVE:   'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
  DRAFT:    'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
  ARCHIVED: 'bg-muted text-muted-foreground border-border hover:bg-muted',
};

const EMPTY_FORM = { governanceAreaId: '', year: String(new Date().getFullYear()), title: '', notes: '', status: 'ACTIVE' };

export default function TemplatesManagePage() {
  const [templates, setTemplates]   = useState([]);
  const [govAreas, setGovAreas]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);

  const [searchQuery, setSearchQuery]   = useState('');
  const [yearFilter, setYearFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage]   = useState(1);
  const [pageSize, setPageSize]         = useState(10);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen]     = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen]     = useState(false);
  const [selected, setSelected]         = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [copyForm, setCopyForm]         = useState({ governanceAreaId: '', year: String(new Date().getFullYear() + 1), title: '' });

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tData, gData] = await Promise.all([getAllTemplates(), getGovernanceAreas()]);
      setTemplates(tData.templates ?? []);
      setGovAreas(gData.governanceAreas ?? []);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Managed years for dropdowns (fallbacks to existing template years)
  const [yearOptions, setYearOptions] = useState([]);

  useEffect(() => {
    getYears({ includeInactive: false })
      .then((res) => {
        const yrs = (res.years || []).map((y) => String(y.year)).sort((a, b) => b - a);
        if (yrs.length > 0) {
          setYearOptions(yrs);
        } else {
          const derived = [...new Set(templates.map((t) => String(t.year)))].sort((a, b) => b - a);
          if (derived.length > 0) {
            setYearOptions(derived);
          } else {
            setYearOptions(['2026', '2025', '2024']);
          }
        }
      })
      .catch(() => {
        const derived = [...new Set(templates.map((t) => String(t.year)))].sort((a, b) => b - a);
        if (derived.length > 0) {
          setYearOptions(derived);
        } else {
          setYearOptions(['2026', '2025', '2024']);
        }
      });
  }, [templates]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const years = yearOptions;

  const filtered = templates.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.governance_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.governance_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchYear   = yearFilter === 'all' || String(t.year) === yearFilter;
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchYear && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const active   = templates.filter((t) => t.status === 'ACTIVE').length;
  const draft    = templates.filter((t) => t.status === 'DRAFT').length;
  const archived = templates.filter((t) => t.status === 'ARCHIVED').length;

  const formatDate = (ds) => new Date(ds).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      await createTemplate({
        governanceAreaId: form.governanceAreaId,
        year: Number(form.year),
        title: form.title.trim(),
        notes: form.notes.trim() || null,
        status: form.status,
      });
      setIsCreateOpen(false);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to create template.');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const openEdit = (t) => {
    setSelected(t);
    setForm({ governanceAreaId: t.governance_area_id, year: String(t.year), title: t.title, notes: t.notes ?? '', status: t.status });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateTemplate(selected.id, {
        governanceAreaId: form.governanceAreaId,
        year: Number(form.year),
        title: form.title.trim(),
        notes: form.notes.trim() || null,
        status: form.status,
      });
      setIsEditOpen(false);
      setSelected(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to update template.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const openDelete = (t) => { setSelected(t); setIsDeleteOpen(true); };

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      await deleteTemplate(selected.id);
      setIsDeleteOpen(false);
      setSelected(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to delete template.');
    } finally {
      setSaving(false);
    }
  };

  // ── Copy ───────────────────────────────────────────────────────────────────
  const openCopy = (t) => {
    setSelected(t);
    setCopyForm({
      governanceAreaId: t.governance_area_id,
      year: String(Number(t.year) + 1),
      title: `${t.title} (Copy)`,
    });
    setIsCopyOpen(true);
  };

  const handleCopy = async () => {
    setSaving(true);
    setError(null);
    try {
      await copyTemplate(selected.id, {
        governanceAreaId: copyForm.governanceAreaId,
        year: Number(copyForm.year),
        title: copyForm.title.trim(),
      });
      setIsCopyOpen(false);
      setSelected(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to copy template.');
    } finally {
      setSaving(false);
    }
  };

  // ── Quick status change ────────────────────────────────────────────────────
  const setStatus = async (id, status) => {
    setError(null);
    try {
      await updateTemplate(id, { status });
      setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to update status.');
    }
  };

  return (
    <div className="space-y-6" data-tour-id="templates-manage-root">

      {/* Header */}
      <div className="flex justify-between items-center" data-tour-id="templates-manage-header">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Templates</h1>
          <p className="text-muted-foreground">Create and manage governance compliance templates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setForm(EMPTY_FORM); }}>
            <DialogTrigger asChild>
              <Button disabled={loading}><Plus className="mr-2 h-4 w-4" />Create Template</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>A template is unique per governance area + year.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Governance Area *</Label>
                  <Select value={form.governanceAreaId} onValueChange={(v) => setForm({ ...form, governanceAreaId: v })}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Select area..." /></SelectTrigger>
                    <SelectContent>
                      {govAreas.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          <span className="font-mono text-xs mr-2">{g.code}</span>{g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Year *</Label>
                  <Select value={form.year} onValueChange={(v) => setForm({ ...form, year: v })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {years.length > 0
                        ? years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)
                        : ['2026', '2025', '2024'].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Title *</Label>
                  <Input className="col-span-3" placeholder="Template title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Notes</Label>
                  <Textarea className="col-span-3" rows={3} placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); setForm(EMPTY_FORM); }} disabled={saving}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving || !form.governanceAreaId || !form.title}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
      <div className="grid gap-4 sm:grid-cols-3" data-tour-id="templates-manage-stats">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{loading ? '—' : active}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{loading ? '—' : draft}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{loading ? '—' : archived}</div></CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card data-tour-id="templates-manage-directory">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Template Directory</CardTitle>
          <CardDescription>All compliance templates across governance areas and years</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3" data-tour-id="templates-manage-filters">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search templates..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
            </div>
            <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-30"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-35"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-22.5">Area</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-17.5 text-center">Year</TableHead>
                  <TableHead className="w-25">Status</TableHead>
                  <TableHead className="w-20 text-center hidden md:table-cell">Items</TableHead>
                  <TableHead className="hidden lg:table-cell w-30">Created</TableHead>
                  <TableHead className="w-15"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No templates found.</TableCell>
                  </TableRow>
                ) : paginated.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{t.governance_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{t.title}</div>
                      {t.notes && <div className="text-xs text-muted-foreground truncate max-w-xs">{t.notes}</div>}
                    </TableCell>
                    <TableCell className="text-center text-sm font-mono">{t.year}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs border', STATUS_STYLE[t.status])}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <span className="text-sm font-medium">{t.item_count ?? 0}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(t)}>
                            <Edit className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openCopy(t)}>
                            <Copy className="mr-2 h-4 w-4" />Copy template
                          </DropdownMenuItem>
                          {t.status !== 'ACTIVE' && (
                            <DropdownMenuItem onClick={() => setStatus(t.id, 'ACTIVE')}>
                              <CheckCircle className="mr-2 h-4 w-4" />Set Active
                            </DropdownMenuItem>
                          )}
                          {t.status !== 'DRAFT' && t.status !== 'ARCHIVED' && (
                            <DropdownMenuItem onClick={() => setStatus(t.id, 'DRAFT')}>
                              <FileText className="mr-2 h-4 w-4" />Set Draft
                            </DropdownMenuItem>
                          )}
                          {t.status !== 'ARCHIVED' && (
                            <DropdownMenuItem onClick={() => setStatus(t.id, 'ARCHIVED')}>
                              <Archive className="mr-2 h-4 w-4" />Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {t.status === 'DRAFT' ? (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDelete(t)}>
                              <Trash2 className="mr-2 h-4 w-4" />Delete
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled>
                              <Trash2 className="mr-2 h-4 w-4" />Delete (Draft only)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-17.5 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 20].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span>{filtered.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)}`} of {filtered.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
                .map((item, idx) =>
                  item === '...'
                    ? <span key={`e-${idx}`} className="px-2 text-muted-foreground text-sm">…</span>
                    : <Button key={item} variant={currentPage === item ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setCurrentPage(item)}>{item}</Button>
                )}
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>{selected?.governance_code} · {selected?.year}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Governance Area *</Label>
              <Select value={form.governanceAreaId} onValueChange={(v) => setForm({ ...form, governanceAreaId: v })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {govAreas.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="font-mono text-xs mr-2">{g.code}</span>{g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Year *</Label>
              <Select value={form.year} onValueChange={(v) => setForm({ ...form, year: v })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.length > 0
                    ? years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)
                    : ['2026', '2025', '2024'].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Title *</Label>
              <Input className="col-span-3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Notes</Label>
              <Textarea className="col-span-3" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving || !form.title}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => { setIsDeleteOpen(open); if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Template
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selected?.title}</strong>? All checklist items inside will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Dialog */}
      <Dialog open={isCopyOpen} onOpenChange={(open) => { setIsCopyOpen(open); if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Copy Template</DialogTitle>
            <DialogDescription>
              Create a new <strong>DRAFT</strong> template by copying <strong>{selected?.title}</strong> and all its checklist items.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Governance Area *</Label>
              <Select value={copyForm.governanceAreaId} onValueChange={(v) => setCopyForm({ ...copyForm, governanceAreaId: v })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {govAreas.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="font-mono text-xs mr-2">{g.code}</span>{g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Year *</Label>
              <Select value={copyForm.year} onValueChange={(v) => setCopyForm({ ...copyForm, year: v })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.length > 0
                    ? years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)
                    : ['2026', '2025', '2024'].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Title *</Label>
              <Input
                className="col-span-3"
                value={copyForm.title}
                onChange={(e) => setCopyForm({ ...copyForm, title: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCopyOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCopy} disabled={saving || !copyForm.governanceAreaId || !copyForm.year || !copyForm.title}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Copying…</> : 'Copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HelpTourOverlay
        buttonLabel="Templates manage help"
        steps={[
          {
            title: "Template management overview",
            description: "This page lets you create, update, copy, archive, and delete governance templates.",
            selector: '[data-tour-id="templates-manage-header"]',
            selectorLabel: "Manage Templates header",
          },
          {
            title: "Create and refresh templates",
            description: "Use Create Template to add a new governance template and Refresh to sync current records.",
            selector: '[data-tour-id="templates-manage-header"]',
            selectorLabel: "Header actions",
          },
          {
            title: "Monitor status distribution",
            description: "These cards show active, draft, and archived template counts for quick planning checks.",
            selector: '[data-tour-id="templates-manage-stats"]',
            selectorLabel: "Template status cards",
          },
          {
            title: "Use template filters",
            description: "Search by title or governance area, then filter by year and status to narrow your list.",
            selector: '[data-tour-id="templates-manage-filters"]',
            selectorLabel: "Directory filters",
          },
          {
            title: "Manage templates from the table",
            description: "Use row actions to edit details, duplicate templates, change status, or delete draft templates.",
            selector: '[data-tour-id="templates-manage-directory"]',
            selectorLabel: "Template directory table",
          },
        ]}
      />
    </div>
  );
}

