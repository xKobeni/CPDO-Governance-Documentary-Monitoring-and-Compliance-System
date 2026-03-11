import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Upload,
  Eye,
  FileText,
  Calendar,
  Building2,
  ClipboardList,
  TrendingUp,
  Paperclip,
  Send,
  RefreshCw,
  Info,
} from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { toast } from "react-hot-toast";
import { getOfficeChecklist } from "../api/offices";

// ─── Helpers & Config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  completed:    { label: "Completed",    color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  "in-progress":{ label: "In Progress",  color: "bg-blue-100 text-blue-700 border-blue-200",   dot: "bg-blue-500" },
  pending:      { label: "Pending",      color: "bg-gray-100 text-gray-600 border-gray-200",   dot: "bg-gray-400" },
  overdue:      { label: "Overdue",      color: "bg-red-100 text-red-700 border-red-200",      dot: "bg-red-500" },
};

const STATUS_ICON = {
  completed:     <CheckCircle2 className="h-4 w-4 text-green-600" />,
  "in-progress": <Clock className="h-4 w-4 text-blue-600" />,
  pending:       <Clock className="h-4 w-4 text-gray-400" />,
  overdue:       <AlertCircle className="h-4 w-4 text-red-600" />,
};

/** Derive a UI status string from a submission object + dueDate */
function deriveStatus(submission, dueDate) {
  if (!submission) {
    if (dueDate && new Date(dueDate) < new Date()) return "overdue";
    return "pending";
  }
  const s = submission.status?.toUpperCase();
  if (s === "APPROVED") return "completed";
  if (s === "SUBMITTED") return "in-progress";
  if (s === "REJECTED") return "pending"; // needs resubmission
  return "pending";
}

/** Transform the API checklist response into the shape the UI expects */
function transformApiChecklist(apiAreas) {
  return apiAreas.map((area) => ({
    id: area.id,
    area: area.name,
    icon: null,
    items: area.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      status: deriveStatus(item.submission, item.dueDate),
      due: item.dueDate,
      submittedAt: item.submission?.submittedAt ?? null,
      remarks: item.submission?.officeRemarks ?? null,
      required: item.isRequired,
      submissionId: item.submission?.id ?? null,
      submissionStatus: item.submission?.status ?? null,
    })),
  }));
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function daysUntil(dateStr) {
  const diff = Math.round((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ─── Submit Item Dialog ───────────────────────────────────────────────────────
function SubmitDialog({ item, open, onClose }) {
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast.error("Please add submission notes before submitting.");
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900)); // mock delay
    toast.success(`"${item?.title}" submitted successfully!`);
    setSubmitting(false);
    setNotes("");
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-red-600" />
            Submit Checklist Item
          </DialogTitle>
          <DialogDescription>
            Submit your compliance documentation for review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <p className="font-medium">{item?.title}</p>
            <p className="text-xs text-muted-foreground">{item?.description}</p>
            {item?.due && (
              <p className="text-xs flex items-center gap-1 pt-1">
                <Calendar className="h-3 w-3" />
                Due: {formatDate(item.due)}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Submission Notes <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Describe what you are submitting and any relevant notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1">
            <Label>Attach Document <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={submitting}
                className="text-sm"
              />
            </div>
            {file && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {file.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Accepted: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : <><Send className="mr-2 h-4 w-4" />Submit</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Checklist Item Row ───────────────────────────────────────────────────────
function ChecklistItemRow({ item, onSubmit, onView }) {
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const days = daysUntil(item.due);
  const dueSoon = item.status !== "completed" && days >= 0 && days <= 7;

  return (
    <div className="flex items-start sm:items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors group">
      <div className="mt-0.5 sm:mt-0 shrink-0">{STATUS_ICON[item.status]}</div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium truncate">{item.title}</span>
          {item.required && <span className="text-[10px] text-red-600 font-semibold uppercase tracking-wide">Required</span>}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <span className={`text-xs flex items-center gap-1 ${dueSoon ? "text-amber-600 font-medium" : item.status === "overdue" ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
            <Calendar className="h-3 w-3" />
            {item.status === "completed" ? `Submitted ${formatDate(item.submittedAt)}` : `Due ${formatDate(item.due)}`}
            {item.status !== "completed" && days < 0 && " (overdue)"}
            {dueSoon && ` (${days}d left)`}
          </span>
          {item.remarks && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <Info className="h-3 w-3" />
              {item.remarks}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {item.status === "completed" ? (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(item)}>
            <Eye className="mr-1 h-3 w-3" />
            View
          </Button>
        ) : (
          <Button size="sm" className="h-7 text-xs" onClick={() => onSubmit(item)}>
            <Send className="mr-1 h-3 w-3" />
            Submit
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Checklist Area Card ──────────────────────────────────────────────────────
function ChecklistAreaCard({ area, onSubmit, onView, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const total = area.items.length;
  const done = area.items.filter((i) => i.status === "completed").length;
  const overdue = area.items.filter((i) => i.status === "overdue").length;
  const pct = Math.round((done / total) * 100);

  return (
    <Card>
      <button
        className="w-full text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl">{area.icon}</span>
              <div className="min-w-0">
                <CardTitle className="text-base">{area.area}</CardTitle>
                <CardDescription className="text-xs">{done}/{total} completed · {area.items.filter(i => i.status === "in-progress").length} in progress</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {overdue > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                  {overdue} overdue
                </Badge>
              )}
              <span className="text-sm font-semibold text-muted-foreground w-10 text-right">{pct}%</span>
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          <Progress value={pct} className="h-1.5 mt-2" />
        </CardHeader>
      </button>

      {open && (
        <CardContent className="pt-0 space-y-2">
          {area.items.map((item) => (
            <ChecklistItemRow key={item.id} item={item} onSubmit={onSubmit} onView={onView} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyChecklistsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [submitItem, setSubmitItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year] = useState(new Date().getFullYear());
  const [officeName, setOfficeName] = useState(user?.office || "Your Office");

  useEffect(() => {
    if (!user?.officeId) return;
    getOfficeChecklist(user.officeId, year)
      .then((res) => {
        const apiData = res.data;
        if (apiData?.office?.name) setOfficeName(apiData.office.name);
        setChecklists(transformApiChecklist(apiData?.areas ?? []));
      })
      .catch((err) => {
        console.error("Failed to load checklist", err);
        toast.error("Failed to load your checklist. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [user?.officeId, year]);

  // Flatten all items for summary stats
  const allItems = checklists.flatMap((a) => a.items);
  const total = allItems.length;
  const completed = allItems.filter((i) => i.status === "completed").length;
  const inProgress = allItems.filter((i) => i.status === "in-progress").length;
  const overdue = allItems.filter((i) => i.status === "overdue").length;
  const pending = allItems.filter((i) => i.status === "pending").length;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Filter logic
  const filteredAreas = checklists
    .filter((a) => areaFilter === "all" || a.id === areaFilter)
    .map((a) => ({
      ...a,
      items: a.items.filter((item) => {
        const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || (item.description || "").toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || item.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    }))
    .filter((a) => a.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Checklists</h1>
          <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Building2 className="h-3.5 w-3.5" />
            {officeName} · Compliance Year: {year}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2 shrink-0">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="font-semibold text-foreground">{completionPct}%</span> overall completion
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Completed", value: completed, color: "text-green-600", bg: "bg-green-50", icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> },
          { label: "In Progress", value: inProgress, color: "text-blue-600", bg: "bg-blue-50", icon: <Clock className="h-4 w-4 text-blue-600" /> },
          { label: "Pending", value: pending, color: "text-gray-600", bg: "bg-gray-50", icon: <ClipboardList className="h-4 w-4 text-gray-500" /> },
          { label: "Overdue", value: overdue, color: "text-red-600", bg: "bg-red-50", icon: <AlertCircle className="h-4 w-4 text-red-600" /> },
        ].map((s) => (
          <Card key={s.label} className={`${s.bg} border-0 shadow-sm`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="shrink-0">{s.icon}</div>
              <div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall Progress Bar */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">{completed} of {total} items completed</span>
          </div>
          <Progress value={completionPct} className="h-2.5" />
          <p className="text-xs text-muted-foreground">{completionPct}% · {total - completed} items remaining</p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search checklist items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filter by area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {checklists.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.area}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Checklist Areas */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-8 w-8 mb-3 animate-spin opacity-50" />
            <p className="text-sm">Loading checklist items...</p>
          </CardContent>
        </Card>
      ) : filteredAreas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ClipboardList className="mx-auto h-10 w-10 mb-3 opacity-30" />
            {checklists.length === 0 ? (
              <>
                <p className="font-medium">No governance areas assigned</p>
                <p className="text-sm">Contact your administrator to assign compliance areas to your office.</p>
              </>
            ) : (
              <>
                <p className="font-medium">No checklist items found</p>
                <p className="text-sm">Try adjusting your search or filters.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAreas.map((area, idx) => (
            <ChecklistAreaCard
              key={area.id}
              area={area}
              onSubmit={(item) => setSubmitItem(item)}
              onView={(item) => setViewItem(item)}
              defaultOpen={idx === 0}
            />
          ))}
        </div>
      )}

      {/* Submit Dialog */}
      <SubmitDialog
        item={submitItem}
        open={!!submitItem}
        onClose={() => setSubmitItem(null)}
      />

      {/* View Dialog (completed item) */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Submission Details
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-muted p-3 space-y-1.5">
                <p className="font-medium text-sm">{viewItem.title}</p>
                <p className="text-xs text-muted-foreground">{viewItem.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 mt-0.5">Completed</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium">{formatDate(viewItem.submittedAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border p-2.5">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="text-xs">No attached document (mockup)</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
