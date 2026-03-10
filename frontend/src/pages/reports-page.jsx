import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
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
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getReportSummary, getNoUploadReport } from '../api/reports';
import { getOffices } from '../api/offices';

const STATUS_CONFIG = {
  PENDING:            { label: 'Pending',            icon: Clock,         color: 'bg-yellow-100 text-yellow-800', card: 'text-yellow-600' },
  APPROVED:           { label: 'Approved',           icon: CheckCircle2,  color: 'bg-green-100 text-green-800',  card: 'text-green-600'  },
  DENIED:             { label: 'Denied',             icon: XCircle,       color: 'bg-red-100 text-red-800',      card: 'text-red-600'    },
  REVISION_REQUESTED: { label: 'Revision Requested', icon: RotateCcw,     color: 'bg-blue-100 text-blue-800',    card: 'text-blue-600'   },
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - i);

export default function ReportsPage() {
  const [year, setYear] = useState(String(currentYear));
  const [offices, setOffices] = useState([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');

  // Summary report state
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Missing uploads state
  const [missingUploads, setMissingUploads] = useState(null);
  const [missingLoading, setMissingLoading] = useState(false);

  // Load offices on mount
  useEffect(() => {
    getOffices()
      .then((res) => {
        const data = res.data || res;
        setOffices(Array.isArray(data) ? data : []);
      })
      .catch(() => toast.error('Failed to load offices'));
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const params = { year };
      if (selectedOfficeId) params.officeId = selectedOfficeId;
      const data = await getReportSummary(params);
      setSummary(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load summary report');
    } finally {
      setSummaryLoading(false);
    }
  }, [year, selectedOfficeId]);

  const loadMissingUploads = useCallback(async () => {
    if (!selectedOfficeId) {
      toast.error('Please select an office to view missing uploads');
      return;
    }
    try {
      setMissingLoading(true);
      const data = await getNoUploadReport({ year, officeId: selectedOfficeId });
      setMissingUploads(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load missing uploads report');
    } finally {
      setMissingLoading(false);
    }
  }, [year, selectedOfficeId]);

  // Auto-load summary on year/office change
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Derived stats from summary
  const breakdown = summary?.breakdown || [];
  const statusMap = { PENDING: 0, APPROVED: 0, DENIED: 0, REVISION_REQUESTED: 0 };
  for (const row of breakdown) {
    if (statusMap[row.status] !== undefined) statusMap[row.status] = Number(row.count);
  }
  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const reviewed = statusMap.APPROVED + statusMap.DENIED + statusMap.REVISION_REQUESTED;
  const approvalRate = reviewed > 0 ? ((statusMap.APPROVED / reviewed) * 100).toFixed(1) : '—';

  // Group missing uploads by governance area
  const missingByGov = (missingUploads?.missing || []).reduce((acc, item) => {
    const key = item.governance_code;
    if (!acc[key]) acc[key] = { name: item.governance_name, code: item.governance_code, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});

  const exportMissingCSV = () => {
    const rows = missingUploads?.missing || [];
    if (!rows.length) return;
    const header = 'Governance Area,Governance Code,Item Code,Item Title\n';
    const body = rows
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

  const selectedOfficeName = offices.find((o) => String(o.id) === selectedOfficeId)?.name || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Submission statistics and compliance tracking</p>
        </div>

        {/* Global filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={year} onValueChange={(v) => { setYear(v); setMissingUploads(null); }}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedOfficeId || 'all'} onValueChange={(v) => { setSelectedOfficeId(v === 'all' ? '' : v); setMissingUploads(null); }}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Offices" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Offices</SelectItem>
              {offices.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={loadSummary} disabled={summaryLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${summaryLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {summaryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">submissions in {year}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{statusMap.PENDING.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">awaiting review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statusMap.APPROVED.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Denied</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{statusMap.DENIED.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">denied</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revision</CardTitle>
              <RotateCcw className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statusMap.REVISION_REQUESTED.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">needs revision</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {approvalRate === '—' ? '—' : `${approvalRate}%`}
              </div>
              <p className="text-xs text-muted-foreground">of reviewed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">
            <BarChart3 className="h-4 w-4 mr-2" />
            Status Summary
          </TabsTrigger>
          <TabsTrigger value="missing">
            <FileX className="h-4 w-4 mr-2" />
            Missing Uploads
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Status Summary ── */}
        <TabsContent value="summary" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Submission Status Breakdown</CardTitle>
              <CardDescription>
                Status distribution for {year}{selectedOfficeName ? ` — ${selectedOfficeName}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse h-12 bg-gray-100 rounded" />
                  ))}
                </div>
              ) : breakdown.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <AlertCircle className="h-8 w-8" />
                  <p>No submissions found for the selected filters.</p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                        <TableHead>Distribution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(statusMap).map(([status, count]) => {
                        const cfg = STATUS_CONFIG[status];
                        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                        const Icon = cfg.icon;
                        return (
                          <TableRow key={status}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${cfg.card}`} />
                                <Badge variant="outline" className={cfg.color}>
                                  {cfg.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">{count.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{pct}%</TableCell>
                            <TableCell className="w-40">
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-primary transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="font-semibold bg-muted/50">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{total.toLocaleString()}</TableCell>
                        <TableCell className="text-right">100%</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Missing Uploads ── */}
        <TabsContent value="missing" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <CardTitle>Missing Uploads</CardTitle>
                  <CardDescription>
                    Checklist items with no submission for {year}
                    {selectedOfficeName ? ` — ${selectedOfficeName}` : ''}
                  </CardDescription>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMissingUploads}
                    disabled={missingLoading || !selectedOfficeId}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${missingLoading ? 'animate-spin' : ''}`} />
                    {missingUploads ? 'Reload' : 'Generate'}
                  </Button>
                  {missingUploads && missingUploads.missing.length > 0 && (
                    <Button variant="outline" size="sm" onClick={exportMissingCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Office required prompt */}
              {!selectedOfficeId && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                  <Building2 className="h-10 w-10" />
                  <p className="font-medium">Select an office above to view missing uploads</p>
                  <p className="text-sm">The Missing Uploads report is per-office.</p>
                </div>
              )}

              {/* Loading */}
              {selectedOfficeId && missingLoading && (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse h-12 bg-gray-100 rounded" />
                  ))}
                </div>
              )}

              {/* Not generated yet */}
              {selectedOfficeId && !missingLoading && !missingUploads && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <FileX className="h-8 w-8" />
                  <p>Click <strong>Generate</strong> to load the missing uploads report.</p>
                </div>
              )}

              {/* Results */}
              {selectedOfficeId && !missingLoading && missingUploads && (
                missingUploads.missing.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <p className="font-medium text-green-700">All checklist items have been submitted!</p>
                    <p className="text-sm">No missing uploads for {selectedOfficeName} in {year}.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span>
                        <strong className="text-red-600">{missingUploads.missing.length}</strong> missing item{missingUploads.missing.length !== 1 ? 's' : ''} found
                      </span>
                    </div>

                    {Object.values(missingByGov).map((gov) => (
                      <div key={gov.code}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">
                            {gov.code}
                          </Badge>
                          <span className="text-sm font-medium">{gov.name}</span>
                          <span className="text-xs text-muted-foreground">({gov.items.length} missing)</span>
                        </div>
                        <div className="border rounded-md mb-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-28">Item Code</TableHead>
                                <TableHead>Title</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {gov.items.map((item) => (
                                <TableRow key={item.checklist_item_id}>
                                  <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                                  <TableCell>{item.item_title}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
