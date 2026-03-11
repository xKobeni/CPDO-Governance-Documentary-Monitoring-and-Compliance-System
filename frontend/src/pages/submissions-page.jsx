import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  ChevronRight,
  ChevronLeft,
  Building2,
  ShieldCheck,
  FileText,
  Paperclip,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Input } from '../components/ui/input';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA  (flow: Governance Area → Office → Checklist Items)
// ─────────────────────────────────────────────────────────────────────────────

// Level 1 — Governance Areas with aggregate cross-office stats
const MOCK_GOVERNANCE_AREAS = [
  { id: 'ga-01', code: 'GA01', name: 'Transparency and Accountability', totalOffices: 1, pending: 1, approved: 2, denied: 1, revision: 0 },
  { id: 'ga-02', code: 'GA02', name: 'Human Resource Management',       totalOffices: 1, pending: 4, approved: 2, denied: 1, revision: 1 },
  { id: 'ga-03', code: 'GA03', name: 'Financial Stewardship',           totalOffices: 3, pending: 4, approved: 7, denied: 0, revision: 0 },
  { id: 'ga-04', code: 'GA04', name: 'Procurement Integrity',           totalOffices: 1, pending: 1, approved: 3, denied: 0, revision: 0 },
  { id: 'ga-05', code: 'GA05', name: 'Performance Management',          totalOffices: 1, pending: 2, approved: 2, denied: 0, revision: 0 },
  { id: 'ga-06', code: 'GA06', name: 'Service Delivery',                totalOffices: 3, pending: 6, approved: 7, denied: 1, revision: 2 },
  { id: 'ga-07', code: 'GA07', name: 'Capacity Development',            totalOffices: 1, pending: 1, approved: 1, denied: 1, revision: 0 },
  { id: 'ga-08', code: 'GA08', name: 'Infrastructure and Projects',     totalOffices: 1, pending: 0, approved: 4, denied: 0, revision: 1 },
  { id: 'ga-09', code: 'GA09', name: 'Community Health Programs',       totalOffices: 1, pending: 2, approved: 2, denied: 0, revision: 0 },
  { id: 'ga-10', code: 'GA10', name: 'Social Protection',               totalOffices: 1, pending: 1, approved: 2, denied: 0, revision: 0 },
];

// Level 2 — Offices per Governance Area
const MOCK_OFFICES_BY_GOVERNANCE = {
  'GA01': [
    { id: 'off-001', name: 'City Planning Office',                    code: 'CPO',  total: 4, pending: 1, approved: 2, denied: 1, revision: 0, lastSubmitted: '2026-03-04' },
  ],
  'GA02': [
    { id: 'off-003', name: 'Human Resource Management Office',        code: 'HRMO', total: 8, pending: 4, approved: 2, denied: 1, revision: 1, lastSubmitted: '2026-03-05' },
  ],
  'GA03': [
    { id: 'off-001', name: 'City Planning Office',                    code: 'CPO',  total: 3, pending: 2, approved: 1, denied: 0, revision: 0, lastSubmitted: '2026-03-04' },
    { id: 'off-002', name: 'Budget and Finance Department',            code: 'BFD',  total: 5, pending: 1, approved: 4, denied: 0, revision: 0, lastSubmitted: '2026-03-03' },
    { id: 'off-004', name: 'Engineering Office',                      code: 'EO',   total: 3, pending: 1, approved: 2, denied: 0, revision: 0, lastSubmitted: '2026-03-01' },
  ],
  'GA04': [
    { id: 'off-002', name: 'Budget and Finance Department',            code: 'BFD',  total: 4, pending: 1, approved: 3, denied: 0, revision: 0, lastSubmitted: '2026-03-03' },
  ],
  'GA05': [
    { id: 'off-003', name: 'Human Resource Management Office',        code: 'HRMO', total: 4, pending: 2, approved: 2, denied: 0, revision: 0, lastSubmitted: '2026-03-05' },
  ],
  'GA06': [
    { id: 'off-001', name: 'City Planning Office',                    code: 'CPO',  total: 5, pending: 1, approved: 3, denied: 0, revision: 1, lastSubmitted: '2026-03-04' },
    { id: 'off-005', name: 'Health Services Office',                  code: 'HSO',  total: 7, pending: 3, approved: 2, denied: 1, revision: 1, lastSubmitted: '2026-03-06' },
    { id: 'off-006', name: 'Social Welfare and Development Office',   code: 'SWDO', total: 4, pending: 2, approved: 2, denied: 0, revision: 0, lastSubmitted: '2026-03-02' },
  ],
  'GA07': [
    { id: 'off-003', name: 'Human Resource Management Office',        code: 'HRMO', total: 3, pending: 1, approved: 1, denied: 1, revision: 0, lastSubmitted: '2026-03-05' },
  ],
  'GA08': [
    { id: 'off-004', name: 'Engineering Office',                      code: 'EO',   total: 5, pending: 0, approved: 4, denied: 0, revision: 1, lastSubmitted: '2026-03-01' },
  ],
  'GA09': [
    { id: 'off-005', name: 'Health Services Office',                  code: 'HSO',  total: 4, pending: 2, approved: 2, denied: 0, revision: 0, lastSubmitted: '2026-03-06' },
  ],
  'GA10': [
    { id: 'off-006', name: 'Social Welfare and Development Office',   code: 'SWDO', total: 3, pending: 1, approved: 2, denied: 0, revision: 0, lastSubmitted: '2026-03-02' },
  ],
};

// Level 3 — Checklist items per governance area code (shared across offices)
const MOCK_ITEMS_BY_GOVERNANCE = {
  'GA01': [
    { id: 'cat-ga01-1', itemCode: '1', title: 'Basic Compliance', description: 'Top level compliance documents', isCategory: true },
    {
      id: 'sub-001', itemCode: '1.1', title: 'Annual Planning Disclosure Report',
      description: 'Submit the signed annual planning disclosure report.',
      status: 'APPROVED', submittedAt: '2026-03-04T08:25:00Z', submittedBy: 'Juan dela Cruz',
      reviewer: 'Admin User', reviewedAt: '2026-03-05T10:00:00Z', remarks: 'Complete and in order.',
      files: [{ id: 'f-001', name: 'annual-disclosure-2026.pdf', size: 1244821, type: 'application/pdf', uploadedAt: '2026-03-04T08:20:00Z' }],
    },
    {
      id: 'sub-002', itemCode: '1.2', title: 'Signed Approval Page',
      description: 'Attach approval page signed by authorized officer.',
      status: 'PENDING', submittedAt: '2026-03-04T09:00:00Z', submittedBy: 'Juan dela Cruz',
      reviewer: null, reviewedAt: null, remarks: null,
      files: [
        { id: 'f-002', name: 'approval-page-signed.pdf', size: 98000,  type: 'application/pdf', uploadedAt: '2026-03-04T08:58:00Z' },
        { id: 'f-003', name: 'approval-page-scan.jpg',   size: 542000, type: 'image/jpeg',       uploadedAt: '2026-03-04T08:59:00Z' },
      ],
    },
    {
      id: 'sub-003', itemCode: '1.3', title: 'Citizen Satisfaction Survey Results',
      description: 'Upload the compiled satisfaction survey results.',
      status: 'DENIED', submittedAt: '2026-03-03T14:00:00Z', submittedBy: 'Maria Santos',
      reviewer: 'Admin User', reviewedAt: '2026-03-04T09:00:00Z', remarks: 'Document is incomplete. Missing Q4 data.',
      files: [{ id: 'f-004', name: 'survey-results-partial.xlsx', size: 322000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', uploadedAt: '2026-03-03T13:55:00Z' }],
    },
    {
      id: 'sub-004', itemCode: '1.4', title: 'Transparency Board Photo Documentation',
      description: 'Submit photos of transparency board placements.',
      status: 'REVISION_REQUESTED', submittedAt: '2026-03-02T10:00:00Z', submittedBy: 'Pedro Reyes',
      reviewer: 'Admin User', reviewedAt: '2026-03-03T11:00:00Z', remarks: 'Photos are blurry. Please resubmit clearer images.',
      files: [
        { id: 'f-005', name: 'board-photo-1.jpg', size: 780000, type: 'image/jpeg', uploadedAt: '2026-03-02T09:50:00Z' },
        { id: 'f-006', name: 'board-photo-2.jpg', size: 812000, type: 'image/jpeg', uploadedAt: '2026-03-02T09:51:00Z' },
      ],
    },
  ],
  'GA03': [
    { id: 'cat-ga03-2', itemCode: '2', title: 'Financial Stewardship', description: 'Financial and budget compliance documentation', isCategory: true },
    {
      id: 'sub-005', itemCode: '2.1', title: 'Budget Utilization Statement',
      description: 'Submit certified budget utilization report for Q4.',
      status: 'APPROVED', submittedAt: '2026-03-03T12:14:00Z', submittedBy: 'Ana Gonzales',
      reviewer: 'Admin User', reviewedAt: '2026-03-04T08:00:00Z', remarks: 'Verified and approved.',
      files: [{ id: 'f-007', name: 'budget-utilization-q4-2026.pdf', size: 1899012, type: 'application/pdf', uploadedAt: '2026-03-03T12:10:00Z' }],
    },
    {
      id: 'sub-006', itemCode: '2.2', title: 'Financial Audit Report',
      description: 'COA financial audit report certified true copy.',
      status: 'PENDING', submittedAt: '2026-03-05T09:00:00Z', submittedBy: 'Ana Gonzales',
      reviewer: null, reviewedAt: null, remarks: null,
      files: [{ id: 'f-008', name: 'coa-audit-2025.pdf', size: 2340000, type: 'application/pdf', uploadedAt: '2026-03-05T08:55:00Z' }],
    },
    {
      id: 'sub-007', itemCode: '2.3', title: 'Procurement Summary',
      description: 'Summary of all procurement activities for the year.',
      status: 'PENDING', submittedAt: '2026-03-06T07:30:00Z', submittedBy: 'Carlo Mendoza',
      reviewer: null, reviewedAt: null, remarks: null,
      files: [],
    },
  ],
  'GA06': [
    { id: 'cat-ga06-3', itemCode: '3', title: 'Service & Compliance', description: 'Service delivery and ARTA compliance records', isCategory: true },
    {
      id: 'sub-008', itemCode: '3.1', title: 'Service Delivery Report',
      description: 'Annual service delivery accomplishment report.',
      status: 'APPROVED', submittedAt: '2026-03-01T10:00:00Z', submittedBy: 'Lina Torres',
      reviewer: 'Admin User', reviewedAt: '2026-03-02T09:00:00Z', remarks: null,
      files: [{ id: 'f-009', name: 'service-delivery-2025.docx', size: 543000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', uploadedAt: '2026-03-01T09:55:00Z' }],
    },
    {
      id: 'sub-009', itemCode: '3.2', title: 'Citizen Feedback Mechanism Report',
      description: 'Report on citizen complaints and resolutions.',
      status: 'REVISION_REQUESTED', submittedAt: '2026-03-02T14:00:00Z', submittedBy: 'Lina Torres',
      reviewer: 'Admin User', reviewedAt: '2026-03-03T09:30:00Z', remarks: 'Missing resolution column in the feedback log.',
      files: [{ id: 'f-010', name: 'citizen-feedback-2025.xlsx', size: 210000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', uploadedAt: '2026-03-02T13:58:00Z' }],
    },
    {
      id: 'sub-010', itemCode: '3.3', title: 'ARTA Compliance Certificate',
      description: 'Certificate of ARTA compliance from the head office.',
      status: 'APPROVED', submittedAt: '2026-02-28T11:00:00Z', submittedBy: 'Lina Torres',
      reviewer: 'Admin User', reviewedAt: '2026-03-01T08:00:00Z', remarks: null,
      files: [{ id: 'f-011', name: 'arta-cert-2026.pdf', size: 120000, type: 'application/pdf', uploadedAt: '2026-02-28T10:58:00Z' }],
    },
    {
      id: 'sub-011', itemCode: '3.4', title: 'Public Information Material',
      description: 'Copies of IEC materials distributed to community.',
      status: 'PENDING', submittedAt: '2026-03-06T08:00:00Z', submittedBy: 'Roel Bautista',
      reviewer: null, reviewedAt: null, remarks: null,
      files: [{ id: 'f-012', name: 'iec-materials-2026.zip', size: 4500000, type: 'application/zip', uploadedAt: '2026-03-06T07:55:00Z' }],
    },
    {
      id: 'sub-012', itemCode: '3.5', title: 'Client Satisfaction Index',
      description: 'Computed CSI score with supporting data.',
      status: 'DENIED', submittedAt: '2026-03-04T15:00:00Z', submittedBy: 'Roel Bautista',
      reviewer: 'Admin User', reviewedAt: '2026-03-05T08:30:00Z', remarks: 'CSI computation formula is incorrect. Recompute and resubmit.',
      files: [{ id: 'f-013', name: 'csi-data-2026.xlsx', size: 185000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', uploadedAt: '2026-03-04T14:55:00Z' }],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING:            { label: 'Pending',            icon: Clock,        color: 'bg-yellow-100 text-yellow-800', textColor: 'text-yellow-600' },
  APPROVED:           { label: 'Approved',           icon: CheckCircle2, color: 'bg-green-100 text-green-800',   textColor: 'text-green-600'  },
  DENIED:             { label: 'Denied',             icon: XCircle,      color: 'bg-red-100 text-red-800',       textColor: 'text-red-600'    },
  REVISION_REQUESTED: { label: 'Revision Requested', icon: RotateCcw,    color: 'bg-blue-100 text-blue-800',     textColor: 'text-blue-600'   },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getFileIcon(mimeType) {
  if (mimeType?.includes('pdf')) return 'PDF';
  if (mimeType?.includes('image')) return 'IMG';
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return 'XLS';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'DOC';
  if (mimeType?.includes('zip') || mimeType?.includes('rar')) return 'ZIP';
  return 'FILE';
}

function getFileExt(mimeType) {
  if (mimeType?.includes('pdf')) return '.pdf';
  if (mimeType?.includes('image/png')) return '.png';
  if (mimeType?.includes('image')) return '.jpg';
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return '.xlsx';
  if (mimeType?.includes('wordprocessingml') || mimeType?.includes('word')) return '.docx';
  if (mimeType?.includes('zip')) return '.zip';
  return '.file';
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1 — Governance Areas List
// ─────────────────────────────────────────────────────────────────────────────

function GovernanceAreasList({ onSelect }) {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const totalPending  = MOCK_GOVERNANCE_AREAS.reduce((s, a) => s + a.pending, 0);
  const totalApproved = MOCK_GOVERNANCE_AREAS.reduce((s, a) => s + a.approved, 0);
  const totalDenied   = MOCK_GOVERNANCE_AREAS.reduce((s, a) => s + a.denied + a.revision, 0);

  const filtered = MOCK_GOVERNANCE_AREAS.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'HAS_PENDING')  return matchSearch && a.pending > 0;
    if (statusFilter === 'ALL_APPROVED') return matchSearch && a.pending === 0 && a.denied === 0 && a.revision === 0;
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submissions</h1>
        <p className="text-muted-foreground">Review and manage office submissions by governance area</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Governance Areas</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MOCK_GOVERNANCE_AREAS.length}</div>
            <p className="text-xs text-muted-foreground">active areas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalApproved}</div>
            <p className="text-xs text-muted-foreground">approved submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denied / Revision</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalDenied}</div>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Governance Areas</CardTitle>
          <CardDescription>Click a governance area to view office submissions under it</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by area name or code..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {[
                { key: 'ALL',          label: 'All'            },
                { key: 'HAS_PENDING',  label: 'Has Pending'    },
                { key: 'ALL_APPROVED', label: 'Fully Approved' },
              ].map((f) => (
                <Button key={f.key} variant={statusFilter === f.key ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(f.key)}>
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Governance Area</TableHead>
                  <TableHead className="text-center">Offices</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">Approved</TableHead>
                  <TableHead className="text-center">Denied</TableHead>
                  <TableHead className="text-center">Revision</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((area) => (
                  <TableRow key={area.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(area)}>
                    <TableCell><Badge variant="outline" className="font-mono">{area.code}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{area.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{area.totalOffices}</TableCell>
                    <TableCell className="text-center">
                      {area.pending > 0 ? <span className="font-semibold text-yellow-600">{area.pending}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {area.approved > 0 ? <span className="font-semibold text-green-600">{area.approved}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {area.denied > 0 ? <span className="font-semibold text-red-600">{area.denied}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {area.revision > 0 ? <span className="font-semibold text-blue-600">{area.revision}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <AlertCircle className="h-8 w-8" />
                <p>No governance areas match your filter.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 2 — Offices inside a Governance Area
// ─────────────────────────────────────────────────────────────────────────────

function OfficesForArea({ area, onSelect, onBack }) {
  const offices = MOCK_OFFICES_BY_GOVERNANCE[area.code] || [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back to Governance Areas
      </Button>

      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-muted-foreground" />
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{area.code}</Badge>
            <h1 className="text-3xl font-bold tracking-tight">{area.name}</h1>
          </div>
          <p className="text-muted-foreground">Select an office to review its submitted checklist items</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offices Submitted</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{area.totalOffices}</div>
            <p className="text-xs text-muted-foreground">with submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{area.pending}</div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{area.approved}</div>
            <p className="text-xs text-muted-foreground">approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denied / Revision</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{area.denied + area.revision}</div>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Office Submissions</CardTitle>
          <CardDescription>Click an office to view its submitted checklist items for {area.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Office</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">Approved</TableHead>
                  <TableHead className="text-center">Denied</TableHead>
                  <TableHead className="text-center">Revision</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead>Last Submitted</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {offices.map((office) => (
                  <TableRow key={office.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(office)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{office.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="font-mono">{office.code}</Badge></TableCell>
                    <TableCell className="text-center">
                      {office.pending > 0 ? <span className="font-semibold text-yellow-600">{office.pending}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {office.approved > 0 ? <span className="font-semibold text-green-600">{office.approved}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {office.denied > 0 ? <span className="font-semibold text-red-600">{office.denied}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {office.revision > 0 ? <span className="font-semibold text-blue-600">{office.revision}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{office.total}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(office.lastSubmitted)}</TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {offices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <AlertCircle className="h-8 w-8" />
                <p>No offices have submitted for this governance area.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ITEM DETAIL DIALOG
// ─────────────────────────────────────────────────────────────────────────────

function ItemDetailDialog({ item, open, onClose }) {
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono text-xs">{item.itemCode}</Badge>
            <StatusBadge status={item.status} />
          </div>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Submitted by</p>
              <p className="font-medium">{item.submittedBy}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Submitted at</p>
              <p className="font-medium">{formatDateTime(item.submittedAt)}</p>
            </div>
            {item.reviewer && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Reviewed by</p>
                  <p className="font-medium">{item.reviewer}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Reviewed at</p>
                  <p className="font-medium">{formatDateTime(item.reviewedAt)}</p>
                </div>
              </>
            )}
          </div>

          {item.remarks && (
            <div className={`p-3 rounded-md text-sm border ${
              item.status === 'DENIED'             ? 'bg-red-50 border-red-200 text-red-800'   :
              item.status === 'REVISION_REQUESTED' ? 'bg-blue-50 border-blue-200 text-blue-800' :
              'bg-green-50 border-green-200 text-green-800'
            }`}>
              <p className="font-semibold mb-1">Reviewer Remarks</p>
              <p>{item.remarks}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Attached Files ({item.files.length})
            </p>
            {item.files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-md text-muted-foreground gap-1">
                <Paperclip className="h-5 w-5" />
                <p className="text-sm">No files attached</p>
              </div>
            ) : (
              <div className="space-y-2">
                {item.files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border">
                    <span className="text-xs font-bold font-mono bg-muted px-1.5 py-1 rounded text-muted-foreground">
                      {getFileIcon(file.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(file.size)} &middot; {formatDateTime(file.uploadedAt)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Preview">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Download">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {item.status === 'PENDING' && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin Actions</p>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5">
                  <RotateCcw className="h-4 w-4" /> Request Revision
                </Button>
                <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5">
                  <XCircle className="h-4 w-4" /> Deny
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 3 — Checklist Items
// ─────────────────────────────────────────────────────────────────────────────

function ItemsList({ area, office, onBack, onBackToAreas }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const rawItems  = MOCK_ITEMS_BY_GOVERNANCE[area.code] || [];
  const childItems = rawItems.filter((i) => !i.isCategory);

  const getFilteredItems = () => {
    const matchingChildIds = new Set(
      childItems
        .filter((i) => {
          const matchesStatus = statusFilter === 'ALL' || i.status === statusFilter;
          const matchesSearch = !search || i.title.toLowerCase().includes(search.toLowerCase());
          return matchesStatus && matchesSearch;
        })
        .map((i) => i.id)
    );
    return rawItems.filter((item) => {
      if (item.isCategory) {
        return childItems.some(
          (child) => child.itemCode.startsWith(item.itemCode + '.') && matchingChildIds.has(child.id)
        );
      }
      return matchingChildIds.has(item.id);
    });
  };

  const items = getFilteredItems();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBackToAreas} className="-ml-2">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Areas
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Button variant="ghost" size="sm" onClick={onBack}>{area.name}</Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{office.name}</span>
      </div>

      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-muted-foreground" />
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{office.code}</Badge>
            <h1 className="text-3xl font-bold tracking-tight">{office.name}</h1>
          </div>
          <p className="text-muted-foreground">{area.name}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{office.total}</div>
            <p className="text-xs text-muted-foreground">submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{office.pending}</div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{office.approved}</div>
            <p className="text-xs text-muted-foreground">approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denied / Revision</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{office.denied + office.revision}</div>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checklist Items</CardTitle>
          <CardDescription>
            {area.code} · {new Date().getFullYear()} — {childItems.length} item{childItems.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'ALL',                label: 'All'      },
                { key: 'PENDING',            label: 'Pending'  },
                { key: 'APPROVED',           label: 'Approved' },
                { key: 'DENIED',             label: 'Denied'   },
                { key: 'REVISION_REQUESTED', label: 'Revision' },
              ].map((f) => (
                <Button key={f.key} variant={statusFilter === f.key ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(f.key)}>
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>File Types</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  if (item.isCategory) {
                    return (
                      <TableRow key={item.id} className="bg-muted/30 hover:bg-muted/30">
                        <TableCell><span className="text-sm font-bold font-mono">{item.itemCode}</span></TableCell>
                        <TableCell colSpan={5}>
                          <p className="font-bold">{item.title}</p>
                          {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  }

                  const fileExts = [...new Set(item.files.map((f) => getFileExt(f.type)))];

                  return (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedItem(item)}>
                      <TableCell><span className="text-xs text-muted-foreground font-mono">» {item.itemCode}</span></TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          {item.remarks && (
                            <p className={`text-xs mt-0.5 italic ${item.status === 'DENIED' ? 'text-red-600' : 'text-blue-600'}`}>
                              {item.remarks}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.files.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {fileExts.map((ext) => (
                              <span key={ext} className="text-xs font-mono text-muted-foreground">{ext}</span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.submittedBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(item.submittedAt)}</TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <AlertCircle className="h-8 w-8" />
                <p>No items found for this filter.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ItemDetailDialog item={selectedItem} open={!!selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const [view, setView]               = useState('areas');
  const [selectedArea, setSelectedArea]     = useState(null);
  const [selectedOffice, setSelectedOffice] = useState(null);

  const handleSelectArea    = (area)   => { setSelectedArea(area);     setView('offices'); };
  const handleSelectOffice  = (office) => { setSelectedOffice(office); setView('items');   };
  const handleBackToAreas   = ()       => { setSelectedArea(null); setSelectedOffice(null); setView('areas');   };
  const handleBackToOffices = ()       => { setSelectedOffice(null);                        setView('offices'); };

  return (
    <div className="space-y-6">
      {view === 'areas' && (
        <GovernanceAreasList onSelect={handleSelectArea} />
      )}
      {view === 'offices' && selectedArea && (
        <OfficesForArea area={selectedArea} onSelect={handleSelectOffice} onBack={handleBackToAreas} />
      )}
      {view === 'items' && selectedArea && selectedOffice && (
        <ItemsList area={selectedArea} office={selectedOffice} onBack={handleBackToOffices} onBackToAreas={handleBackToAreas} />
      )}
    </div>
  );
}


