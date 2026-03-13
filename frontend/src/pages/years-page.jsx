import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertTriangle, Calendar, Loader2, Plus, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { getYears, createYear, updateYear } from '../api/years';

export default function YearsPage() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));

  const loadYears = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getYears({ includeInactive: true });
      setYears(data.years ?? []);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to load years.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadYears();
  }, []);

  const handleCreate = async () => {
    const yearNum = Number(newYear);
    if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
      setError('Year must be a 4-digit number between 2000 and 2100.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = await createYear(yearNum);
      const created = data.year;
      setYears((prev) => {
        const existingIndex = prev.findIndex((y) => y.id === created.id);
        if (existingIndex >= 0) {
          const copy = [...prev];
          copy[existingIndex] = created;
          return copy;
        }
        return [created, ...prev].sort((a, b) => b.year - a.year);
      });
      setIsCreateOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to create year.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (yearRow) => {
    setSaving(true);
    setError(null);
    try {
      const data = await updateYear(yearRow.id, { isActive: !yearRow.is_active });
      const updated = data.year;
      setYears((prev) => prev.map((y) => (y.id === updated.id ? updated : y)));
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to update year.');
    } finally {
      setSaving(false);
    }
  };

  const activeYears = years.filter((y) => y.is_active).length;
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
          <span>{error}</span>
          <button
            className="ml-auto text-red-500 hover:text-red-700"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Years</h1>
          <p className="text-muted-foreground">
            Configure which reporting years are available across dashboards, templates, and reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadYears} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Year
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Years</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{years.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active and inactive
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Years</CardTitle>
            <ToggleRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeYears}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Shown in dropdowns by default
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Year</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentYear}</div>
            <p className="text-xs text-muted-foreground mt-1">
              New entries default to this year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Year Directory</CardTitle>
          <CardDescription>
            Control which years are available for reporting and template configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell w-[200px]">Created</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                      Loading years…
                    </TableCell>
                  </TableRow>
                ) : years.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No years configured yet. Click <strong>Add Year</strong> to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  years.map((y) => (
                    <TableRow key={y.id}>
                      <TableCell className="font-mono text-sm">{y.year}</TableCell>
                      <TableCell>
                        {y.is_active ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {y.created_at
                          ? new Date(y.created_at).toLocaleDateString('en-PH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(y)}
                          disabled={saving}
                        >
                          {y.is_active ? (
                            <>
                              <ToggleLeft className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleRight className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Year</DialogTitle>
            <DialogDescription>
              Add a new reporting year. This will become available in dashboard, reports, and template filters.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm font-medium">Year</span>
              <Input
                className="col-span-3"
                type="number"
                min={2000}
                max={2100}
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

