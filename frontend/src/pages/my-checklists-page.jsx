import React, { useState, useEffect } from "react";
import { useLocation } from "react-router";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
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
  RotateCcw,
  Info,
  MessageSquare,
  MoreVertical,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { toast } from "react-hot-toast";
import { getOfficeChecklist } from "../api/offices";
import {
  createSubmission,
  listSubmissionFiles,
  uploadSubmissionFile,
  listSubmissionComments,
  createSubmissionComment,
  deleteSubmissionComment,
  listSubmissionReviews,
} from "../api/submissions";
import { getYears } from "../api/years";

// ─── Helpers & Config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  completed:    { label: "Completed",    color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  "in-progress":{ label: "Pending",      color: "bg-blue-100 text-blue-700 border-blue-200",   dot: "bg-blue-500" },
  "not-approved":{ label: "Not Approved", color: "bg-red-100 text-red-700 border-red-200",     dot: "bg-red-500" },
  "no-uploaded":{ label: "No Uploaded",  color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  pending:      { label: "Pending",      color: "bg-gray-100 text-gray-600 border-gray-200",   dot: "bg-gray-400" },
  overdue:      { label: "Overdue",      color: "bg-red-100 text-red-700 border-red-200",      dot: "bg-red-500" },
};

const STATUS_ICON = {
  completed:     <CheckCircle2 className="h-4 w-4 text-green-600" />,
  "in-progress": <Clock className="h-4 w-4 text-blue-600" />,
  "not-approved": <XCircle className="h-4 w-4 text-red-600" />,
  "no-uploaded": <Upload className="h-4 w-4 text-amber-600" />,
  pending:       <Clock className="h-4 w-4 text-gray-400" />,
  overdue:       <AlertCircle className="h-4 w-4 text-red-600" />,
};

/** Derive a UI status string from a submission object + dueDate */
function deriveStatus(submission, dueDate) {
  if (!submission) {
    if (dueDate && new Date(dueDate) < new Date()) return "overdue";
    return "no-uploaded";
  }
  const s = submission.status?.toUpperCase();
  if (s === "APPROVED") return "completed";
  if (s === "PENDING") return "in-progress";
  if (s === "DENIED" || s === "REVISION_REQUESTED") return "not-approved";
  return "in-progress";
}

/** Transform the API checklist response into the shape the UI expects */
function transformApiChecklist(apiAreas) {
  return apiAreas.map((area) => ({
    id: area.id,
    area: area.name,
    icon: null,
    items: (() => {
      const nodes = (area.items ?? []).map((item) => ({
        id: item.id,
        parentId: item.parentItemId ?? null,
        title: item.title,
        description: item.description,
        status: deriveStatus(item.submission, item.dueDate),
        due: item.dueDate,
        submittedAt: item.submission?.submittedAt ?? null,
        remarks: item.submission?.officeRemarks ?? null,
        required: item.isRequired,
        frequency: item.frequency ?? null,
        allowedFileTypes: item.allowedFileTypes ?? null,
        maxFiles: item.maxFiles ?? null,
        submissionId: item.submission?.id ?? null,
        submissionStatus: item.submission?.status ?? null,
        sortOrder: item.sortOrder ?? 0,
        itemCode: item.itemCode ?? "",
        children: [],
      }));

      const byId = new Map(nodes.map((n) => [n.id, n]));
      const roots = [];

      for (const n of nodes) {
        if (n.parentId && byId.has(n.parentId)) {
          const parent = byId.get(n.parentId);
          parent.children.push(n);
          n.parentTitle = parent.title;
          n.parentItemCode = parent.itemCode || null;
        } else {
          roots.push(n);
        }
      }

      const sortFn = (a, b) => (a.sortOrder - b.sortOrder) || String(a.itemCode).localeCompare(String(b.itemCode));
      const sortTree = (arr) => {
        arr.sort(sortFn);
        for (const x of arr) sortTree(x.children);
      };
      sortTree(roots);

      return roots;
    })(),
  }));
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(dateStr) {
  const diff = Math.round((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ─── Submit Item Dialog ───────────────────────────────────────────────────────
function SubmitDialog({ item, open, onClose, onSubmit }) {
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentFiles, setCurrentFiles] = useState([]);
  const [currentFilesLoading, setCurrentFilesLoading] = useState(false);
  const isReplace = Boolean(item?.submissionId);

  const allowedTypes = Array.isArray(item?.allowedFileTypes) ? item.allowedFileTypes : null;
  const acceptAttr = allowedTypes && allowedTypes.length > 0
    ? allowedTypes.map((t) => `.${String(t).toLowerCase()}`).join(",")
    : ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg";
  const allowedLabel = allowedTypes && allowedTypes.length > 0
    ? allowedTypes.map((t) => String(t).toUpperCase()).join(", ")
    : "PDF, DOC, DOCX, XLS, XLSX, PNG, JPG";

  const handleFileChange = (e) => {
    const next = e.target.files?.[0] || null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setFile(next);
    if (next) {
      setPreviewUrl(URL.createObjectURL(next));
    }
  };

  useEffect(() => {
    if (!open && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFile(null);
      setRemarks("");
    }
  }, [open, previewUrl]);

  useEffect(() => {
    if (!open || !isReplace || !item?.submissionId) {
      setCurrentFiles([]);
      return;
    }
    let cancelled = false;
    setCurrentFilesLoading(true);
    listSubmissionFiles(item.submissionId)
      .then((res) => {
        if (!cancelled) setCurrentFiles(res.files ?? []);
      })
      .catch(() => {
        if (!cancelled) setCurrentFiles([]);
      })
      .finally(() => {
        if (!cancelled) setCurrentFilesLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, isReplace, item?.submissionId]);

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please choose a file to upload.");
      return;
    }

    // Validate extension against allowed types, if provided
    if (allowedTypes && allowedTypes.length > 0) {
      const name = file.name || "";
      const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
      if (!allowedTypes.map((t) => String(t).toLowerCase()).includes(ext)) {
        toast.error(`File type ".${ext || "?"}" is not allowed. Accepted: ${allowedLabel}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit?.({ notes: remarks.trim() || null, file });
      toast.success(isReplace ? `"${item?.title}" replaced successfully!` : `"${item?.title}" submitted successfully!`);
      setRemarks("");
      setFile(null);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReplace ? (
              <>
                <RotateCcw className="h-4 w-4 text-amber-600" />
                Replace Document
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 text-blue-600" />
                Upload Document
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isReplace
              ? "Upload a new file to replace your current submission. It will be set to Pending for review."
              : "Submit your office's supporting document for this checklist item."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-4 sm:space-y-0 sm:flex sm:items-start sm:gap-6">
          {/* Left column: details + file + remarks */}
          <div className="flex-1 space-y-4">
            <div className="rounded-lg border bg-muted/60 p-3 text-sm space-y-1">
              {item?.parentTitle ? (
                <>
                  <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Parent Section
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.parentItemCode && <span className="font-bold text-foreground">{item.parentItemCode}</span>}
                    {item.parentItemCode && " · "}
                    <span className="font-medium">{item.parentTitle}</span>
                  </p>
                  <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase pt-1.5">
                    Target Document
                  </p>
                </>
              ) : (
                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Target Document
                </p>
              )}
              <p className="font-medium">{item?.title}</p>
              {item?.description ? (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              ) : null}
              {item?.due && (
                <p className="text-xs flex items-center gap-1 pt-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Due: {formatDate(item.due)}
                </p>
              )}
            </div>
            {isReplace && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
                  Current submission (to be replaced)
                </p>
                {currentFilesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : currentFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No files in current submission.</p>
                ) : (
                  <div className="space-y-2">
                    {currentFiles.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 rounded bg-white/80 border border-amber-100 p-2">
                        <FileText className="h-4 w-4 shrink-0 text-amber-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{f.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(f.file_size_bytes)}
                            {f.uploaded_at ? ` · ${formatDate(f.uploaded_at)}` : ""}
                          </p>
                        </div>
                        {f.is_current && (
                          <Badge variant="outline" className="text-[10px] shrink-0">Current</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1">
              <Label>
                {isReplace ? "Select New File " : "Select File "}
                <span className="text-xs text-muted-foreground">
                  ({allowedLabel})
                </span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept={acceptAttr}
                  onChange={handleFileChange}
                  disabled={submitting}
                  className="text-sm bg-white"
                />
              </div>
              {file && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {file.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Accepted: {allowedLabel}
              </p>
            </div>
            <div className="space-y-1">
              <Label>
                Office Remarks{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                placeholder="e.g., This document includes annexes A and B."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Right column: preview */}
          <div className="mt-4 sm:mt-0 sm:w-80 lg:w-96">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <div className="mt-1 border rounded-md bg-muted/40 p-2 max-h-[70vh] overflow-hidden">
              {file && (
                <>
                {previewUrl && file.type.startsWith("image/") && (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="max-h-64 w-full object-contain rounded"
                  />
                )}
                {previewUrl && file.type === "application/pdf" && (
                  <iframe
                    src={previewUrl}
                    title={file.name}
                    className="w-full h-64 rounded border"
                  />
                )}
                {previewUrl && !file.type && file.name.toLowerCase().endsWith(".pdf") && (
                  <iframe
                    src={previewUrl}
                    title={file.name}
                    className="w-full h-64 rounded border"
                  />
                )}
                {previewUrl && !file.type && (file.name.toLowerCase().endsWith(".png") || file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg")) && (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="max-h-64 w-full object-contain rounded"
                  />
                )}
                {previewUrl && !/\.(pdf|png|jpe?g)$/i.test(file.name) && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground flex-1">
                      Preview is not available for this file type.
                    </p>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] px-2"
                    >
                      <a href={previewUrl} target="_blank" rel="noreferrer">
                        Open locally
                      </a>
                    </Button>
                  </div>
                )}
                {!previewUrl && (
                  <p className="text-xs text-muted-foreground">
                    Preview will appear here after selecting a supported file type.
                  </p>
                )}
                </>
              )}
              {!file && (
                <p className="text-xs text-muted-foreground">
                  Select a file on the left to preview it here.
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {isReplace ? "Replacing…" : "Submitting…"}
              </>
            ) : isReplace ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Replace
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatBytes(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num) || num <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = num;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function ViewSubmissionDialog({ item, open, onClose, onUploaded }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  const submissionId = item?.submissionId ?? null;
  const submissionStatus = String(item?.submissionStatus || "").toUpperCase();
  const canUpload = Boolean(submissionId) && submissionStatus !== "APPROVED";

  async function refreshFiles() {
    if (!submissionId) return;
    setLoading(true);
    try {
      const res = await listSubmissionFiles(submissionId);
      setFiles(res.files ?? []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load files.");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  async function refreshComments() {
    if (!submissionId) return;
    setCommentsLoading(true);
    try {
      const res = await listSubmissionComments(submissionId, { page: 1, limit: 50 });
      setComments(res?.data ?? []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function refreshReviews() {
    if (!submissionId) return;
    setReviewsLoading(true);
    try {
      const res = await listSubmissionReviews(submissionId);
      setReviews(res?.reviews ?? []);
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }

  async function doUpload() {
    if (!submissionId || !fileToUpload) return;
    setUploading(true);
    try {
      await uploadSubmissionFile(submissionId, fileToUpload);
      toast.success("File uploaded");
      setFileToUpload(null);
      await refreshFiles();
      onUploaded?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handlePostComment() {
    const text = commentText.trim();
    if (!text || !submissionId) return;
    setPostingComment(true);
    try {
      await createSubmissionComment(submissionId, text);
      setCommentText("");
      await refreshComments();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to post comment.");
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!submissionId) return;
    setDeletingCommentId(commentId);
    try {
      await deleteSubmissionComment(submissionId, commentId);
      await refreshComments();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete comment.");
    } finally {
      setDeletingCommentId(null);
    }
  }

  useEffect(() => {
    if (open && submissionId) {
      refreshFiles();
      refreshComments();
      refreshReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submissionId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Submission Details
          </DialogTitle>
          <DialogDescription>
            {item?.title}
          </DialogDescription>
        </DialogHeader>

        {!submissionId ? (
          <div className="text-sm text-muted-foreground">
            No submission record yet for this item.
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="secondary" className="mt-0.5">
                  {submissionStatus || "—"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="font-medium">{formatDate(item?.submittedAt)}</p>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Uploaded files</p>
                <Button variant="outline" size="sm" onClick={refreshFiles} disabled={loading}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading…
                </div>
              ) : files.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-2">No files uploaded yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {files.map((f) => (
                    <div key={f.id} className="flex items-start justify-between gap-3 rounded-md bg-muted/40 border p-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{f.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          v{f.version_no} · {formatBytes(f.file_size_bytes)} · {formatDate(f.uploaded_at)}
                        </p>
                      </div>
                      {f.is_current && (
                        <Badge variant="outline" className="text-[10px]">Current</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canUpload && (
              <div className="space-y-2">
                <Label>Upload a new version</Label>
                <Input
                  type="file"
                  onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                  disabled={uploading}
                />
                <div className="flex justify-end">
                  <Button onClick={doUpload} disabled={!fileToUpload || uploading} className="gap-2">
                    {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</> : <><Upload className="h-4 w-4" />Upload</>}
                  </Button>
                </div>
              </div>
            )}

            {/* Review history — formal decisions from staff/admin */}
            <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-800/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Reviewer decisions
                </CardTitle>
                <CardDescription>Formal approval decisions — updates status and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reviews yet. Your submission is pending evaluation.</p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r) => {
                      const action = String(r.action || "").toUpperCase();
                      const label = action === "APPROVE" ? "Approved" : action === "DENY" ? "Denied" : "Revision requested";
                      const bg = action === "APPROVE" ? "bg-green-100 text-green-700 border-green-200" : action === "DENY" ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200";
                      return (
                        <div key={r.id} className="rounded-lg border p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className={bg}>{label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {r.reviewer_name || "Reviewer"} · {formatDateTime(r.reviewed_at)}
                            </span>
                          </div>
                          {r.decision_notes && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.decision_notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Discussion — informal comments */}
            <Card className="border-slate-200 bg-slate-50/50 dark:bg-slate-950/30 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Discussion
                  <Badge variant="secondary" className="text-xs font-normal">Comments</Badge>
                </CardTitle>
                <CardDescription>Informal notes and questions — does not change status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2">
                  <Textarea
                    rows={3}
                    placeholder="Ask a question or add a note…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={postingComment}
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" variant="secondary" onClick={handlePostComment} disabled={postingComment || !commentText.trim()}>
                      {postingComment ? "Posting…" : "Post comment"}
                    </Button>
                  </div>
                </div>
                {commentsLoading ? (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No comments yet. Start the conversation.</p>
                ) : (
                  <div className="space-y-2">
                    {comments.map((c) => (
                      <div key={c.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {c.full_name || c.email || "User"}
                              <span className="text-xs text-muted-foreground font-normal"> · {formatDateTime(c.created_at)}</span>
                            </p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{c.comment}</p>
                          </div>
                          {user?.id === c.author_user_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={() => handleDeleteComment(c.id)}
                              disabled={deletingCommentId === c.id}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status Badge (icon + label, matches legend) ───────────────────────────────
function StatusBadge({ submissionStatus, uiStatus }) {
  const s = String(submissionStatus || "").toUpperCase();
  let label, className, Icon;
  if (!submissionStatus) {
    label = "No uploaded";
    className = "bg-amber-50 text-amber-700 border-amber-200";
    Icon = Upload;
  } else if (s === "APPROVED") {
    label = "Approved";
    className = "bg-green-100 text-green-700 border-green-200";
    Icon = CheckCircle2;
  } else if (s === "DENIED") {
    label = "Denied";
    className = "bg-red-100 text-red-700 border-red-200";
    Icon = XCircle;
  } else if (s === "REVISION_REQUESTED") {
    label = "Revision";
    className = "bg-amber-50 text-amber-700 border-amber-200";
    Icon = Clock;
  } else if (s === "PENDING") {
    label = "Pending";
    className = "bg-blue-100 text-blue-700 border-blue-200";
    Icon = Clock;
  } else {
    label = uiStatus === "completed" ? "Approved" : "Not approved";
    className = uiStatus === "completed" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200";
    Icon = uiStatus === "completed" ? CheckCircle2 : XCircle;
  }
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function ChecklistItemRow_REMOVED({ item, onSubmit, onView, depth = 0, expanded = true, onToggle, headerCode }) {
  const isHeader = (item.children?.length ?? 0) > 0;
  const days = daysUntil(item.due);
  const dueSoon = item.status !== "completed" && days >= 0 && days <= 7;

  if (isHeader) {
    const leafCount = (function countLeaves(n) {
      if (!n.children?.length) return 1;
      return n.children.reduce((acc, c) => acc + countLeaves(c), 0);
    })(item);

    return (
      <div
        className={cn(
          "w-full flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors cursor-pointer",
          depth > 0 ? "bg-muted/20 hover:bg-muted/40" : "bg-muted/10 hover:bg-muted/30"
        )}
        style={{ marginLeft: depth ? Math.min(depth * 16, 48) : 0 }}
      >
        <button type="button" onClick={() => onToggle?.(item.id)} className="min-w-0 flex-1 flex items-center gap-3 text-left">
          <span className="inline-flex h-7 min-w-7 px-2 items-center justify-center rounded-md bg-white border text-slate-700 text-xs font-semibold shrink-0 shadow-sm">
            {headerCode ?? ""}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold truncate">{item.title}</span>
              <Badge variant="secondary" className="text-[10px]">
                {leafCount} item{leafCount === 1 ? "" : "s"}
              </Badge>
              {item.required && (
                <span className="text-[10px] text-red-600 font-semibold uppercase tracking-wide">Required</span>
              )}
            </div>
            {item.description ? (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
            ) : null}
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
          )}
        </button>
      </div>
    );
  }

  const chip = statusChip(item.submissionStatus, item.status);
  const isApproved = String(item.submissionStatus || "").toUpperCase() === "APPROVED";
  const hasSubmission = Boolean(item.submissionId);
  const fileTypes = Array.isArray(item.allowedFileTypes)
    ? item.allowedFileTypes.map((t) => String(t).toLowerCase()).join(", ")
    : (item.allowedFileTypes ? String(item.allowedFileTypes) : "—");

  return (
    <div
      className={cn(
        "relative flex items-start sm:items-center gap-3 rounded-lg border px-4 py-3 transition-colors group",
        depth > 0 ? "bg-muted/5 hover:bg-muted/20 pl-6" : "hover:bg-muted/10"
      )}
      style={{ marginLeft: depth ? Math.min(depth * 16, 48) : 0 }}
    >
      {depth > 0 ? (
        <span aria-hidden="true" className="absolute left-3 top-0 bottom-0 w-4 pointer-events-none">
          <span className="absolute left-2 top-0 bottom-0 w-px bg-border" />
          <span className="absolute left-2 top-1/2 w-2 h-px bg-border" />
        </span>
      ) : null}

      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{item.title}</p>
            {item.description ? <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p> : null}
            <div className="flex flex-wrap items-center gap-2 pt-1.5">
              <span
                className={cn(
                  "text-xs flex items-center gap-1",
                  dueSoon ? "text-amber-600 font-medium" : item.status === "overdue" ? "text-red-600 font-medium" : "text-muted-foreground"
                )}
              >
                <Calendar className="h-3 w-3 shrink-0" />
                {item.status === "completed" ? `Submitted ${formatDate(item.submittedAt)}` : `Due ${formatDate(item.due)}`}
                {item.status !== "completed" && days < 0 && " (overdue)"}
                {dueSoon && item.status !== "completed" && ` (${days}d left)`}
              </span>
              {fileTypes && fileTypes !== "—" && (
                <span className="text-xs text-muted-foreground">· {fileTypes}</span>
              )}
              {item.remarks ? (
                <span className="text-xs flex items-center gap-1 rounded-md border bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 px-2 py-1 text-emerald-800 dark:text-emerald-200 w-full sm:w-auto">
                  <Info className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium">Office remarks:</span> {item.remarks}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-semibold", chip.className)}>
              {chip.label}
            </span>
            <div className="flex items-center gap-2">
              {hasSubmission ? (
                <>
                  <Button
                    variant={isApproved ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => onView(item)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Button>
                  {!isApproved && (
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => onSubmit(item)}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Replace
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => onSubmit(item)}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Checklist Area Card ──────────────────────────────────────────────────────
function ChecklistAreaCard({ area, accentClass = "border-l-blue-500", onSubmit, onView, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const flattenLeafItems = (items) =>
    (items || []).flatMap((i) => ((i.children?.length ?? 0) > 0 ? flattenLeafItems(i.children) : [i]));
  const flat = flattenLeafItems(area.items);
  const total = flat.length;
  const done = flat.filter((i) => i.status === "completed").length;
  const overdue = flat.filter((i) => i.status === "overdue").length;
  const inProg = flat.filter((i) => i.status === "in-progress").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  useEffect(() => {
    // Auto-expand all header rows initially for a friendlier experience
    const ids = new Set();
    const walk = (items) => {
      for (const it of items) {
        if (it.children?.length) ids.add(it.id);
        if (it.children?.length) walk(it.children);
      }
    };
    walk(area.items);
    setExpandedIds(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area.id]);

  const toggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card className={cn("border-l-4 transition-all hover:shadow-md", accentClass)}>
      <button
        type="button"
        className="w-full text-left cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <CardHeader className="pb-3">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-medium">{area.area}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {done}/{total} completed
                  {inProg > 0 && ` · ${inProg} in progress`}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {overdue > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                  {overdue} overdue
                </Badge>
              )}
              <span className="text-sm font-semibold text-muted-foreground w-10 text-right tabular-nums">{pct}%</span>
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          <Progress value={pct} className="h-1.5 mt-3" />
        </CardHeader>
      </button>

      {open && (
        <CardContent className="pt-0">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Item</TableHead>
                  <TableHead className="font-semibold w-[140px]">Status</TableHead>
                  <TableHead className="font-semibold w-[160px]">Submitted</TableHead>
                  <TableHead className="w-[52px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(function render(items, depth = 0, parentCode = "") {
                  const toLetter = (n) => {
                    let x = n;
                    let out = "";
                    while (x > 0) {
                      x -= 1;
                      out = String.fromCharCode(97 + (x % 26)) + out;
                      x = Math.floor(x / 26);
                    }
                    return out;
                  };
                  let headerCounter = 0;

                  return items.flatMap((item) => {
                    const isHeader = (item.children?.length ?? 0) > 0;
                    const isExpanded = isHeader ? expandedIds.has(item.id) : true;

                    let headerCode;
                    if (isHeader) {
                      headerCounter += 1;
                      headerCode = item.itemCode
                        ? item.itemCode
                        : (depth === 0 ? String(headerCounter) : `${parentCode}.${toLetter(headerCounter)}`);
                    }

                    if (isHeader) {
                      return [
                        <TableRow
                          key={item.id}
                          className="bg-muted/25 hover:bg-muted/25 cursor-pointer"
                          onClick={() => toggle(item.id)}
                        >
                          <TableCell className="min-w-[260px] py-2.5">
                            <div className="relative min-w-0 flex items-center gap-2" style={{ paddingLeft: depth ? depth * 12 : 0 }}>
                              {depth > 0 && (
                                <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-3">
                                  <span className="absolute left-1.5 top-0 bottom-1/2 w-px bg-border" />
                                  <span className="absolute left-1.5 top-1/2 w-3 h-px bg-border" />
                                </span>
                              )}
                              <Badge variant="secondary" className="font-mono text-xs font-bold shrink-0">{headerCode ?? ""}</Badge>
                              <p className="text-sm font-bold truncate">{item.title}</p>
                            </div>
                          </TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell>{isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}</TableCell>
                        </TableRow>,
                        ...(isExpanded ? render(item.children, depth + 1, headerCode ?? parentCode) : []),
                      ];
                    }

                    const isApproved = String(item.submissionStatus || "").toUpperCase() === "APPROVED";
                    const hasSubmission = Boolean(item.submissionId);
                    const handleRowClick = () => {
                      if (hasSubmission && isApproved) onView(item);
                      else if (hasSubmission && !isApproved) onSubmit(item);
                      else onSubmit(item);
                    };

                    return (
                      <TableRow
                        key={item.id}
                        className="transition-colors hover:bg-muted/50 cursor-pointer"
                        onClick={handleRowClick}
                        title={hasSubmission && isApproved ? "Click to view" : "Click to upload"}
                      >
                        <TableCell className="min-w-[260px] py-2.5">
                          <div className="relative min-w-0" style={{ paddingLeft: depth ? depth * 12 : 0 }}>
                            {depth > 0 && (
                              <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-3">
                                <span className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
                                <span className="absolute left-1.5 top-1/2 w-3 h-px bg-border" />
                              </span>
                            )}
                            <p className="text-sm font-medium">{item.title}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <StatusBadge submissionStatus={item.submissionStatus} uiStatus={item.status} />
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-muted-foreground">
                          {item.submittedAt ? formatDateTime(item.submittedAt) : "—"}
                        </TableCell>
                        <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {hasSubmission && (
                                <DropdownMenuItem onClick={() => onView(item)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                              )}
                              {hasSubmission && !isApproved && (
                                <DropdownMenuItem onClick={() => onSubmit(item)}>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Replace
                                </DropdownMenuItem>
                              )}
                              {!hasSubmission && (
                                <DropdownMenuItem onClick={() => onSubmit(item)}>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })(area.items, 0, "")}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyChecklistsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [submitItem, setSubmitItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [yearOptions, setYearOptions] = useState([]);
  const [officeName, setOfficeName] = useState(user?.office || "Your Office");

  async function loadChecklist() {
    if (!user?.officeId) return;
    setLoading(true);
    try {
      const res = await getOfficeChecklist(user.officeId, year);
      const apiData = res.data;
      if (apiData?.office?.name) setOfficeName(apiData.office.name);
      setChecklists(transformApiChecklist(apiData?.areas ?? []));
    } catch (err) {
      console.error("Failed to load checklist", err);
      toast.error("Failed to load your checklist. Please try again.");
      setChecklists([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChecklist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.officeId, year]);

  // Allow deep-linking from dashboard quick actions, e.g. /my-checklists?status=overdue
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const status = (params.get("status") || "").toLowerCase();
    const allowed = new Set(["all", "no-uploaded", "pending", "not-approved", "approved"]);
    if (allowed.has(status)) setStatusFilter(status);
  }, [location.search]);

  function matchesStatusFilter(itemStatus) {
    if (statusFilter === "all") return true;
    // "no-uploaded" covers both items with no submission (no-uploaded) and past-due ones (overdue)
    if (statusFilter === "no-uploaded") return itemStatus === "no-uploaded" || itemStatus === "overdue";
    // "pending" maps to "in-progress" — deriveStatus() never produces a bare "pending" value
    if (statusFilter === "pending") return itemStatus === "in-progress";
    if (statusFilter === "not-approved") return itemStatus === "not-approved";
    if (statusFilter === "approved") return itemStatus === "completed";
    return true;
  }

  function matchesSearchFilter(item) {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(item.title || "").toLowerCase().includes(q) ||
      String(item.description || "").toLowerCase().includes(q)
    );
  }

  function filterChecklistTree(items) {
    // Keep section/header rows when any child matches filters.
    // Leaf rows must match filters themselves.
    const walk = (nodes) => {
      const out = [];
      for (const n of nodes || []) {
        const children = Array.isArray(n.children) ? n.children : [];
        if (children.length > 0) {
          const nextChildren = walk(children);
          // Only keep headers if they still have visible children after filtering.
          // This prevents headers from turning into "leaf rows" that show a status badge.
          if (nextChildren.length > 0) out.push({ ...n, children: nextChildren });
        } else {
          const matchSearch = matchesSearchFilter(n);
          const matchStatus = matchesStatusFilter(n.status);
          if (matchSearch && matchStatus) out.push(n);
        }
      }
      return out;
    };
    return walk(items);
  }

  // Load available years for the Office user (managed years with fallback)
  useEffect(() => {
    getYears({ includeInactive: false })
      .then((res) => {
        const yrs = (res.years || []).map((y) => y.year).sort((a, b) => b - a);
        if (yrs.length > 0) {
          setYearOptions(yrs);
          if (!yrs.includes(year)) {
            setYear(yrs[0]);
          }
        } else {
          setYearOptions([currentYear - 1, currentYear, currentYear + 1]);
        }
      })
      .catch(() => {
        setYearOptions([currentYear - 1, currentYear, currentYear + 1]);
      });
  }, [currentYear]); 

  async function handleSubmitChecklistItem(item, { notes, file }) {
    if (!user?.officeId) throw new Error("Missing officeId");
    if (!item?.id) throw new Error("Missing checklist item id");

    const created = await createSubmission({
      year,
      officeId: user.officeId,
      checklistItemId: item.id,
      officeRemarks: notes ?? null,
    });

    const submissionId = created?.submission?.id;
    if (!submissionId) throw new Error("Submission not created");

    if (file) {
      await uploadSubmissionFile(submissionId, file);
    }

    await loadChecklist();
  }

  // Filter logic
  const filteredAreas = checklists
    .filter((a) => areaFilter === "all" || a.id === areaFilter)
    .map((a) => ({
      ...a,
      items: filterChecklistTree(a.items),
    }))
    .filter((a) => a.items.length > 0);

  // Summary counts — derived from filteredAreas so the cards always match what's visible below
  const flattenLeaves = (items) =>
    (items || []).flatMap((i) => ((i.children?.length ?? 0) > 0 ? flattenLeaves(i.children) : [i]));

  const visibleItems = filteredAreas.flatMap((a) => flattenLeaves(a.items));
  const totalItems = visibleItems.length;
  const completedItems = visibleItems.filter((i) => i.status === "completed").length;
  const overdueItems = visibleItems.filter((i) => i.status === "overdue").length;
  const noUploadedItems = visibleItems.filter((i) => i.status === "no-uploaded").length;
  const completionPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Unfiltered leaf count — used for the progress bar and area filter dropdown availability
  const allLeafItems = checklists.flatMap((a) => flattenLeaves(a.items));

  const CARD_ACCENTS = [
    "border-l-blue-500",
    "border-l-emerald-500",
    "border-l-violet-500",
    "border-l-amber-500",
    "border-l-rose-500",
    "border-l-cyan-500",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Checklists</h1>
          <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">{officeName}</span>
            <span>·</span>
            <span>Compliance Year {year}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary strip — counts reflect current filters */}
      {!loading && allLeafItems.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">Checklist items</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedItems}</div>
              <p className="text-xs text-muted-foreground">{completionPct}% completion</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Upload</CardTitle>
              <Upload className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{noUploadedItems}</div>
              <p className="text-xs text-muted-foreground">Need documents</p>
            </CardContent>
          </Card>
          <Card className={overdueItems > 0 ? "border-red-200 bg-red-50/30" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className={cn("h-4 w-4", overdueItems > 0 ? "text-red-600" : "text-muted-foreground")} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", overdueItems > 0 && "text-red-600")}>{overdueItems}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status legend */}
      <nav className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
        <span className="font-medium text-muted-foreground">Status:</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> No uploaded</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Pending</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Not approved</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" /> Approved</span>
      </nav>

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
            <SelectItem value="no-uploaded">No uploaded</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="not-approved">Not approved</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
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
        <Card className="border-l-4 border-l-muted">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-8 w-8 mb-3 animate-spin opacity-50" />
            <p className="text-sm">Loading checklist items...</p>
          </CardContent>
        </Card>
      ) : filteredAreas.length === 0 ? (
        <Card className="rounded-lg border border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <ClipboardList className="mx-auto h-10 w-10 mb-3 opacity-30" />
            {checklists.length === 0 ? (
              <>
                <p className="font-medium">No governance areas assigned</p>
                <p className="text-sm mt-1">Contact your administrator to assign compliance areas to your office.</p>
              </>
            ) : (
              <>
                <p className="font-medium">No checklist items found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters.</p>
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
              accentClass={CARD_ACCENTS[idx % CARD_ACCENTS.length]}
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
        onSubmit={(payload) => handleSubmitChecklistItem(submitItem, payload)}
      />

      <ViewSubmissionDialog
        item={viewItem}
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        onUploaded={loadChecklist}
      />
    </div>
  );
}
