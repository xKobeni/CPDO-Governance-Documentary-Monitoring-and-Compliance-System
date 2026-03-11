import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  LayoutList,
  AlertTriangle,
  Info,
  Loader2,
  Building2,
} from 'lucide-react';
import {
  getGovernanceAreas,
  createGovernanceArea as apiCreateArea,
  updateGovernanceArea as apiUpdateArea,
  deleteGovernanceArea as apiDeleteArea,
  getAssignedOffices,
} from '../api/governance';

const EMPTY_FORM = { code: '', name: '', description: '', sortOrder: '', isActive: true };

// ─── Component ────────────────────────────────────────────────────────────────
export default function GovernancePage() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [isAssignedOfficesOpen, setIsAssignedOfficesOpen] = useState(false);
  const [viewingArea, setViewingArea] = useState(null);
  const [assignedOfficesYear, setAssignedOfficesYear] = useState(new Date().getFullYear());
  const [assignedOffices, setAssignedOffices] = useState([]);
  const [assignedOfficesLoading, setAssignedOfficesLoading] = useState(false);

  const loadAreas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGovernanceAreas();
      setAreas(data.governanceAreas);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load governance areas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAreas(); }, [loadAreas]);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = areas.filter((a) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && a.is_active) ||
      (statusFilter === 'inactive' && !a.is_active);
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearchChange = (e) => { setSearchQuery(e.target.value); setCurrentPage(1); };
  const handleStatusChange = (v) => { setStatusFilter(v); setCurrentPage(1); };
  const handlePageSizeChange = (v) => { setPageSize(Number(v)); setCurrentPage(1); };

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        name: form.name.trim(),
        ...(form.description.trim() && { description: form.description.trim() }),
        ...(form.sortOrder && { sortOrder: Number(form.sortOrder) }),
      };
      const data = await apiCreateArea(payload);
      setAreas((prev) => [...prev, data.governanceArea]);
      setIsCreateOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create governance area.');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const openEdit = (area) => {
    setSelected(area);
    setForm({ code: area.code, name: area.name, description: area.description || '', sortOrder: String(area.sort_order), isActive: area.is_active });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        sortOrder: Number(form.sortOrder) || selected.sort_order,
        isActive: form.isActive,
      };
      const data = await apiUpdateArea(selected.id, payload);
      setAreas((prev) => prev.map((a) => a.id === selected.id ? data.governanceArea : a));
      setIsEditOpen(false);
      setSelected(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update governance area.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle Active ───────────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    const area = areas.find((a) => a.id === id);
    try {
      const data = await apiUpdateArea(id, { isActive: !area.is_active });
      setAreas((prev) => prev.map((a) => a.id === id ? data.governanceArea : a));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const openDelete = (area) => { setSelected(area); setIsDeleteOpen(true); };
  const handleDelete = async () => {
    setSaving(true);
    try {
      await apiDeleteArea(selected.id);
      setAreas((prev) => prev.filter((a) => a.id !== selected.id));
      setIsDeleteOpen(false);
      setSelected(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete governance area.');
      setIsDeleteOpen(false);
    } finally {
      setSaving(false);
    }
  };
  // ── Assigned Offices ────────────────────────────────────────────────────
  const openAssignedOffices = async (area, year = new Date().getFullYear()) => {
    setViewingArea(area);
    setAssignedOfficesYear(year);
    setAssignedOffices([]);
    setIsAssignedOfficesOpen(true);
    setAssignedOfficesLoading(true);
    try {
      const res = await getAssignedOffices(area.id, year);
      setAssignedOffices(res.data || []);
    } catch {
      setAssignedOffices([]);
    } finally {
      setAssignedOfficesLoading(false);
    }
  };

  const handleAssignedOfficesYearChange = (year) => {
    if (viewingArea) openAssignedOffices(viewingArea, Number(year));
  };
  // ── Stats ───────────────────────────────────────────────────────────────────
  const total = areas.length;
  const activeCount = areas.filter((a) => a.is_active).length;
  const inactiveCount = total - activeCount;

  const formatDate = (ds) =>
    new Date(ds).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
          <span>{error}</span>
          <button className="ml-auto text-red-500 hover:text-red-700" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Governance Areas</h1>
          <p className="text-muted-foreground">
            Define the governance categories that templates and submissions are organized under
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAreas} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Area
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Create Governance Area</DialogTitle>
                <DialogDescription>
                  Add a new governance area. The code must be unique (e.g. GA11).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Code *</Label>
                  <Input
                    className="col-span-3"
                    placeholder="e.g. GA11"
                    maxLength={10}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Name *</Label>
                  <Input
                    className="col-span-3"
                    placeholder="Governance area name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Description</Label>
                  <Textarea
                    className="col-span-3"
                    placeholder="Brief description..."
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Sort Order</Label>
                  <Input
                    className="col-span-3"
                    type="number"
                    min={0}
                    placeholder="e.g. 11"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); setForm(EMPTY_FORM); }}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!form.code || !form.name || saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : 'Create Area'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Info Banner ────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        <div>
          <span className="font-medium">What are governance areas? </span>
          Each area (e.g. GA01 — Transparency) groups related compliance requirements. Offices submit documents against checklist items that belong to these areas. Only <strong>active</strong> areas appear when creating templates.
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Areas</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground mt-1">total defined (active + inactive)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Areas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">visible to offices &amp; used in templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Areas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCount}</div>
            <p className="text-xs text-muted-foreground mt-1">hidden from offices &amp; template dropdowns</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Table Card ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutList className="h-5 w-5" />
            Area Directory
          </CardTitle>
          <CardDescription>Only Active areas appear in template dropdowns and office checklists. Sort order controls display sequence.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by code, name, or description..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Order</TableHead>
                  <TableHead className="w-[90px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="hidden lg:table-cell w-[130px]">Created</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading governance areas…
                    </TableCell>
                  </TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No governance areas found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((area) => (
                    <TableRow
                      key={area.id}
                      className="cursor-pointer hover:bg-muted/60"
                      onClick={() => openAssignedOffices(area)}
                    >
                      <TableCell className="text-center font-mono text-sm text-muted-foreground">
                        {area.sort_order}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {area.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{area.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs">
                        <span title={area.description} className="line-clamp-2 cursor-help">
                          {area.description || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {area.is_active ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(area.created_at)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(area)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAssignedOffices(area)}>
                              <Building2 className="mr-2 h-4 w-4" />
                              View Assigned Offices
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggle(area.id)}>
                              {area.is_active ? (
                                <><XCircle className="mr-2 h-4 w-4" />Deactivate</>
                              ) : (
                                <><CheckCircle className="mr-2 h-4 w-4" />Activate</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => openDelete(area)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>
                {filtered.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)}`} of {filtered.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-sm">…</span>
                  ) : (
                    <Button
                      key={item}
                      variant={currentPage === item ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(item)}
                    >
                      {item}
                    </Button>
                  )
                )}
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ── Edit Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Governance Area</DialogTitle>
            <DialogDescription>Update the details for {selected?.code}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Code *</Label>
              <Input
                className="col-span-3 font-mono"
                maxLength={10}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name *</Label>
              <Input
                className="col-span-3"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Description</Label>
              <Textarea
                className="col-span-3"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Sort Order</Label>
              <Input
                className="col-span-3"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Active</Label>
              <Select value={form.isActive ? 'true' : 'false'} onValueChange={(v) => setForm({ ...form, isActive: v === 'true' })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!form.code || !form.name || saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assigned Offices Dialog ─────────────────────────────────────────── */}
      <Dialog open={isAssignedOfficesOpen} onOpenChange={setIsAssignedOfficesOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Assigned Offices
            </DialogTitle>
            <DialogDescription>
              Offices assigned to <strong>{viewingArea?.code} – {viewingArea?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Year picker */}
          <div className="flex items-center gap-3 pt-1">
            <Label className="shrink-0">Year</Label>
            <Select value={String(assignedOfficesYear)} onValueChange={handleAssignedOfficesYearChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Offices list */}
          <div className="rounded-md border mt-2 min-h-[120px]">
            {assignedOfficesLoading ? (
              <div className="flex items-center justify-center h-28 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading…
              </div>
            ) : assignedOffices.length === 0 ? (
              <div className="flex items-center justify-center h-28 text-sm text-muted-foreground">
                No offices assigned for {assignedOfficesYear}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Office Code</TableHead>
                    <TableHead>Office Name</TableHead>
                    <TableHead className="w-[140px]">Assigned On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedOffices.map((row) => (
                    <TableRow key={row.office_id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{row.office_code}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{row.office_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(row.assigned_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignedOfficesOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ───────────────────────────────────────────── */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Governance Area
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selected?.code} – {selected?.name}</strong>? This cannot be undone and will fail if templates are using this area.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
