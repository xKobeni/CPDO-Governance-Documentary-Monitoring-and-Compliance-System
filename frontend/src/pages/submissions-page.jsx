import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useLocation } from "react-router";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Alert } from "../components/ui/alert";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardCheck,
  FileText,
  Folder,
  Building2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Search,
  StickyNote,
  Upload,
  XCircle,
  Loader2,
  Download,
  Eye,
  Trash2,
} from "lucide-react";

import { useAuth } from "../hooks/use-auth";
import { cn } from "../lib/utils";
import {
  createSubmission,
  createSubmissionComment,
  deleteSubmissionComment,
  getSubmission,
  listSubmissionComments,
  listSubmissionFiles,
  listSubmissions,
  reviewSubmission,
  uploadSubmissionFile,
  downloadSubmissionFile,
  viewSubmissionFile,
  deleteSubmissionFile,
} from "../api/submissions";
import { getGovernanceAreasWithStats, getAssignedOffices } from "../api/governance";
import { getOfficeChecklist } from "../api/offices";
import { getYears } from "../api/years";
import HelpTourOverlay from "../components/help-tour-overlay";

const STATUS_BADGE = {
  // Blue – pending / waiting for approval
  PENDING: "bg-blue-50 text-blue-700 border-blue-200",
  REVISION_REQUESTED: "bg-blue-50 text-blue-700 border-blue-200",
  // Green – approved
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  // Red – not approved
  DENIED: "bg-red-100 text-red-800 border-red-200",
};

function StatusPill({ status, compact = false }) {
  const s = String(status || "PENDING").toUpperCase();
  const label =
    s === "REVISION_REQUESTED" ? (compact ? "Revision requested" : "Pending (revision requested)") :
    s === "APPROVED" ? "Approved" :
    s === "DENIED" ? "Not approved" :
    "Pending";
  const Icon =
    s === "APPROVED" ? CheckCircle2 :
    s === "DENIED" ? XCircle :
    s === "REVISION_REQUESTED" ? RotateCcw :
    Clock;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 max-w-full whitespace-nowrap",
        compact && "px-2 py-0.5 text-xs",
        STATUS_BADGE[s] ?? STATUS_BADGE.PENDING
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function NoSubmissionPill() {
  return (
    <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-800 border-amber-200">
      <Upload className="h-3 w-3" />
      No uploaded
    </Badge>
  );
}

function ReminderCell({ item, submissionStatus }) {
  const status = String(submissionStatus || "").toUpperCase();
  if (status === "APPROVED" || status === "PENDING") {
    return null;
  }

  if (!item?.dueDate) {
    return <span className="text-xs text-muted-foreground">No due date</span>;
  }
  if (item?.enableReminder === false) {
    return <span className="text-xs text-muted-foreground">No reminder</span>;
  }

  const dueDate = new Date(`${item.dueDate}T23:59:59`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!Number.isNaN(dueDate.getTime()) && dueDate < today) {
    return <span className="text-xs font-medium text-red-600">Overdue</span>;
  }

  const days = Number(item?.reminderDaysBefore || 7);
  return <span className="text-xs text-amber-700">{days}d before due</span>;
}

/** Shown on checklist / list rows when the submission has discussion comments */
function SubmissionDiscussionHint({ count }) {
  const n = Number(count ?? 0);
  if (n <= 0) return null;
  const label = n === 1 ? "1 comment in discussion" : `${n} comments in discussion`;
  return (
    <span
      className="inline-flex items-center gap-1 shrink-0 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
      title={label}
      aria-label={label}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      <span className="text-[10px] font-semibold tabular-nums leading-none">{n}</span>
    </span>
  );
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

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Truncate long file names with ellipsis; full name on hover */
function EllipsisFileName({ name, className, quoted = false }) {
  const raw = name != null ? String(name) : "";
  if (!raw) return <span className={className}>—</span>;
  const display = quoted ? `"${raw}"` : raw;
  return (
    <span
      className={cn(
        "min-w-0 max-w-full truncate align-bottom",
        quoted ? "inline-block" : "block",
        className
      )}
      title={raw}
    >
      {display}
    </span>
  );
}

/** Opened from a list row: either an existing submission or a checklist leaf with nothing uploaded yet */
function SubmissionDetailsDialog({ selection, open, onClose = () => {}, onPromoteToSubmission }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canReview = ["ADMIN", "STAFF"].includes(String(user?.role || "").toUpperCase());
  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";

  const submissionId = selection?.kind === "submission" ? selection.submissionId : null;
  const pendingContext = selection?.kind === "pending" ? selection : null;
  const canInitialSubmit = Boolean(
    pendingContext &&
    (canReview || String(user?.officeId || "") === String(pendingContext.officeId || ""))
  );

  const roleUpper = String(user?.role || "").toUpperCase();
  const isOfficeUser = roleUpper === "OFFICE";
  /** Reviewer messaging: ADMIN and STAFF use the submissions review drill-down */
  const isReviewer = canReview;
  /** Office user opening pending for their own office (edge case vs My Checklists) */
  const isOfficeStartingOwnPending = Boolean(
    pendingContext && isOfficeUser && canInitialSubmit && !isReviewer
  );

  const roleLabelShort =
    roleUpper === "ADMIN" ? "Administrator" :
    roleUpper === "STAFF" ? "Staff reviewer" :
    roleUpper === "OFFICE" ? "Office user" :
    "User";

  const [reviewAction, setReviewAction] = useState("APPROVE");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [commentText, setCommentText] = useState("");
  const [pendingOfficeRemarks, setPendingOfficeRemarks] = useState("");
  const [fileToUpload, setFileToUpload] = useState(null);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  const submissionQuery = useQuery({
    queryKey: ["submissions", "detail", submissionId],
    queryFn: () => getSubmission(submissionId),
    enabled: open && Boolean(submissionId),
  });

  const filesQuery = useQuery({
    queryKey: ["submissions", "files", submissionId],
    queryFn: () => listSubmissionFiles(submissionId),
    enabled: open && Boolean(submissionId),
  });

  const commentsQuery = useQuery({
    queryKey: ["submissions", "comments", submissionId],
    queryFn: () => listSubmissionComments(submissionId, { page: 1, limit: 50 }),
    enabled: open && Boolean(submissionId),
  });

  React.useEffect(() => {
    if (open && selection?.kind === "pending") {
      setPendingOfficeRemarks("");
      setFileToUpload(null);
    }
  }, [open, selection?.kind, selection?.checklistItemId]);

  const createSubmissionUploadMutation = useMutation({
    mutationFn: async ({ file, officeRemarks }) => {
      if (!pendingContext) throw new Error("Missing checklist context");
      const created = await createSubmission({
        year: pendingContext.year,
        officeId: pendingContext.officeId,
        checklistItemId: pendingContext.checklistItemId,
        officeRemarks: officeRemarks?.trim() ? officeRemarks.trim() : null,
      });
      const submission = created?.submission ?? created;
      if (!submission?.id) throw new Error("Submission was not created");
      let uploadOk = true;
      try {
        await uploadSubmissionFile(submission.id, file);
      } catch (uploadErr) {
        uploadOk = false;
        toast.error(
          uploadErr?.response?.data?.message ||
            "Submission was created but the file could not be uploaded. Upload again in submission details."
        );
      }
      return { submission, uploadOk };
    },
    onSuccess: async ({ submission, uploadOk }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["submissions"] }),
        queryClient.invalidateQueries({ queryKey: ["offices"] }),
        queryClient.invalidateQueries({ queryKey: ["governance-areas"] }),
        queryClient.invalidateQueries({ queryKey: ["office-checklist"] }),
      ]);
      if (uploadOk) {
        toast.success("Submission created and file uploaded");
      }
      setPendingOfficeRemarks("");
      setFileToUpload(null);
      if (typeof onPromoteToSubmission === "function") {
        onPromoteToSubmission(submission.id);
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Could not create submission");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ action, decisionNotes }) =>
      reviewSubmission(submissionId, { action, decisionNotes: decisionNotes || null }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["submissions"] }),
        queryClient.invalidateQueries({ queryKey: ["submissions", "detail", submissionId] }),
      ]);
      onClose();
      window.setTimeout(() => {
        toast.success("Review submitted");
      }, 150);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to submit review");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => uploadSubmissionFile(submissionId, file),
    onSuccess: async () => {
      toast.success("File uploaded");
      setFileToUpload(null);
      await queryClient.invalidateQueries({ queryKey: ["submissions", "files", submissionId] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to upload file");
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: (text) => createSubmissionComment(submissionId, text),
    onSuccess: async () => {
      setCommentText("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["submissions", "comments", submissionId] }),
        queryClient.invalidateQueries({ queryKey: ["submissions"] }),
        queryClient.invalidateQueries({ queryKey: ["offices"] }),
      ]);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to post comment");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => deleteSubmissionComment(submissionId, commentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["submissions", "comments", submissionId] }),
        queryClient.invalidateQueries({ queryKey: ["submissions"] }),
        queryClient.invalidateQueries({ queryKey: ["offices"] }),
      ]);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to delete comment");
    },
  });

  const submission = submissionQuery.data?.submission;
  const files = filesQuery.data?.files ?? [];
  const comments = commentsQuery.data?.data ?? [];
  const isApproved = String(submission?.status || "").toUpperCase() === "APPROVED";
  const showFormalReview = canReview && !isApproved;

  const currentFile = files.find((f) => f.is_current) ?? null;

  function handleUpload() {
    if (!fileToUpload) return;
    if (currentFile) {
      setShowReplaceConfirm(true);
    } else {
      uploadMutation.mutate(fileToUpload);
    }
  }

  function handleReview() {
    reviewMutation.mutate({ action: reviewAction, decisionNotes });
  }

  function handlePostComment() {
    const text = commentText.trim();
    if (!text) return;
    createCommentMutation.mutate(text);
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-5xl lg:max-w-6xl max-h-[85vh] min-w-0 overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {pendingContext ? "No submission yet" : "Submission details"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1.5 text-left">
              {pendingContext ? (
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{pendingContext.itemCode}</span>
                  {" · "}
                  {pendingContext.itemTitle}
                </p>
              ) : (
                submissionId ? (
                  <p className="font-mono text-xs text-muted-foreground break-all">{submissionId}</p>
                ) : null
              )}
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Your role:</span>{" "}
                {roleLabelShort}
                {pendingContext && canInitialSubmit && isReviewer ? (
                  <span>
                    {" "}
                    — you can start or add to <span className="font-medium text-foreground">{pendingContext.officeName}</span>
                    {"'"}s record for this item.
                  </span>
                ) : null}
                {pendingContext && isOfficeStartingOwnPending ? (
                  <span>
                    {" "}
                    — you can start this requirement for <span className="font-medium text-foreground">your office</span>
                    {" "}(or use <span className="font-medium text-foreground">My Checklists</span> for the full list).
                  </span>
                ) : null}
                {pendingContext && !canInitialSubmit ? (
                  <span>
                    {" "}
                    — <span className="font-medium text-foreground">view only</span>
                    . You cannot create a submission for this office.
                  </span>
                ) : null}
                {!pendingContext && submission && isReviewer ? (
                  <span>
                    {" "}
                    — you are reviewing <span className="font-medium text-foreground">{submission.office_name}</span>
                    {"'"}s submission (uploads and comments go on their record).
                  </span>
                ) : null}
                {!pendingContext && submission && isOfficeUser ? (
                  <span>
                    {" "}
                    — this is <span className="font-medium text-foreground">your office</span>
                    {"'"}s submission. Staff will review; you cannot approve or deny here.
                  </span>
                ) : null}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {pendingContext ? (
          <div className="space-y-6 min-w-0">
            <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <AlertCircle className="h-4 w-4" />
              <div className="text-sm">
                <p className="font-medium">Nothing uploaded for this checklist item yet</p>
                {canInitialSubmit && isReviewer ? (
                  <>
                    <p className="mt-1 text-muted-foreground dark:text-amber-200/90">
                      Reporting year{" "}
                      <span className="font-medium text-foreground">{pendingContext.year}</span>
                      {" · "}the office listed below has not opened this requirement online.
                      You can attach the first file as a reviewer—that creates their submission record in the system.
                    </p>
                    <ul className="mt-2 list-disc pl-4 space-y-1 text-muted-foreground dark:text-amber-200/90">
                      <li>
                        <span className="font-medium text-foreground">
                          Submitting vs reviewing:
                        </span>{" "}
                        Offices normally submit from <strong>My Checklists</strong>. Use this button only when your office policy
                        lets staff/admin upload on their behalf.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">Office remarks:</span>{" "}
                        Optional notes save as if the submitting office typed them—they appear on their submission overview.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">After upload:</span>{" "}
                        Discussion and <strong>Formal review</strong> unlock the same way as any other submission.
                      </li>
                    </ul>
                  </>
                ) : canInitialSubmit && isOfficeStartingOwnPending ? (
                  <>
                    <p className="mt-1 text-muted-foreground dark:text-amber-200/90">
                      Reporting year{" "}
                      <span className="font-medium text-foreground">{pendingContext.year}</span>
                      . Your office has not uploaded anything for this line item yet.
                    </p>
                    <ul className="mt-2 list-disc pl-4 space-y-1 text-muted-foreground dark:text-amber-200/90">
                      <li>
                        You may attach a file here to start this requirement, or go to{" "}
                        <strong>My Checklists</strong> to work through everything in order.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">Office remarks</span> are optional notes reviewers will see with your submission.
                      </li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-muted-foreground dark:text-amber-200/90">
                      Reporting year{" "}
                      <span className="font-medium text-foreground">{pendingContext.year}</span>
                      . There is nothing on file yet for{" "}
                      <span className="font-medium text-foreground">{pendingContext.officeName}</span>.
                    </p>
                    <ul className="mt-2 list-disc pl-4 space-y-1 text-muted-foreground dark:text-amber-200/90">
                      <li>
                        Your account cannot start this submission—you are in <strong>view only</strong> for this requirement.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">
                          Who can upload the first file:
                        </span>{" "}
                        an <strong>Admin or Staff</strong> reviewer in the Submissions workflow for this governance area,
                        or a logged-in user from <strong>{pendingContext.officeName}</strong>.
                      </li>
                      <li>The office can also submit from their <strong>My Checklists</strong> page when they are signed in.</li>
                    </ul>
                  </>
                )}
              </div>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Overview</CardTitle>
                  <CardDescription>
                    {pendingContext.officeName} · {pendingContext.governanceCode}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Status</span>
                    <NoSubmissionPill />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Checklist item</span>
                    <span className="font-medium text-right">
                      {pendingContext.itemCode} — {pendingContext.itemTitle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-medium">Not submitted</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Year</span>
                    <span className="font-medium">{pendingContext.year}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    Submission notes
                    <Badge variant="outline" className="text-xs font-normal">Office remarks</Badge>
                  </CardTitle>
                  <CardDescription>
                    {canInitialSubmit && isReviewer && (
                      <span>Optional. Saved as remarks on {pendingContext.officeName}&apos;s submission—they read like the office typed them.</span>
                    )}
                    {canInitialSubmit && isOfficeStartingOwnPending && (
                      <span>Optional notes reviewers see with your submission (same field as remarks in My Checklists).</span>
                    )}
                    {!canInitialSubmit &&
                      "You cannot edit—submission has not been created yet for this requirement."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  {canInitialSubmit ? (
                    <Textarea
                      rows={5}
                      placeholder={
                        isReviewer
                          ? `Optional remarks for ${pendingContext.officeName} (shows as Office remarks)`
                          : "Optional remarks for reviewers (shows as Office remarks)"
                      }
                      value={pendingOfficeRemarks}
                      onChange={(e) => setPendingOfficeRemarks(e.target.value)}
                      disabled={createSubmissionUploadMutation.isPending}
                      className="bg-background resize-y min-h-[100px]"
                    />
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {canInitialSubmit ? (
              <Card className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    First evidence file
                  </CardTitle>
                  <CardDescription>
                    {isReviewer ? (
                      <span>
                        One step after you confirm: opens {pendingContext.officeName}&apos;s submission for reporting year{" "}
                        {pendingContext.year}, then attaches your file as proof. Offices usually do this in My Checklists—use this path
                        only when allowed.
                      </span>
                    ) : (
                      <span>
                        One step after you confirm: opens your office&apos;s submission for reporting year {pendingContext.year},
                        then attaches your file as proof.
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 min-w-0">
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
                    <Input
                      type="file"
                      className="max-w-full min-w-0 flex-1 sm:flex-none sm:max-w-md"
                      onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                      disabled={createSubmissionUploadMutation.isPending}
                    />
                    <Button
                      size="sm"
                      className="gap-2 shrink-0"
                      disabled={!fileToUpload || createSubmissionUploadMutation.isPending}
                      onClick={() => {
                        if (!fileToUpload || !pendingContext) return;
                        createSubmissionUploadMutation.mutate({
                          file: fileToUpload,
                          officeRemarks: pendingOfficeRemarks,
                        });
                      }}
                    >
                      {createSubmissionUploadMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Working…
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          {isReviewer ? "Create office submission and upload" : "Start submission and upload"}
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isReviewer
                      ? "Visible to Admin/Staff reviewers on this page. Not available to other offices or the public."
                      : "Only your office can start its own submission for this item when you are signed in as an office user."}
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : (submissionQuery.isLoading || !submission) ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading…
          </div>
        ) : (
          <div className="space-y-6 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Overview</CardTitle>
                  <CardDescription>{submission.office_name} · {submission.governance_code}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Status</span>
                    <StatusPill status={submission.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Checklist item</span>
                    <span className="font-medium text-right">{submission.item_code} — {submission.item_title}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-medium">{formatDateTime(submission.submitted_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Year</span>
                    <span className="font-medium">{submission.year}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-800/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    Submission notes
                    <Badge variant="outline" className="text-xs font-normal border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-400">Office remarks</Badge>
                  </CardTitle>
                  <CardDescription>
                    {isReviewer
                      ? `Remarks submitted with this record (${submission.office_name}). Not the same as Discussion comments below. Offices often edit theirs from My Checklists.`
                      : "Notes your office submitted with this checklist item—these are not the Discussion thread below."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {submission.office_remarks || "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Files */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  Files
                </CardTitle>
                <CardDescription>
                  {isReviewer ? (
                    <span>
                      Evidence files for{" "}
                      <span className="font-medium text-foreground">{submission.office_name}</span>
                      . What you upload is stored on{" "}
                      <span className="font-medium text-foreground">their</span> submission (not yours personally). Replacing
                      the current file asks for confirmation.
                    </span>
                  ) : (
                    <span>
                      Supporting documents reviewers will open—attached to{" "}
                      <span className="font-medium text-foreground">your office&apos;s</span> submission. Replacing may ask you
                      to confirm.
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 min-w-0">
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                      disabled={uploadMutation.isPending}
                    />
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={handleUpload}
                      disabled={!fileToUpload || uploadMutation.isPending}
                    >
                      <Upload className="h-4 w-4" />
                      {uploadMutation.isPending ? "Uploading…" : "Upload"}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => filesQuery.refetch()}
                    disabled={filesQuery.isFetching}
                    className="gap-2"
                  >
                    <RefreshCw className={cn("h-4 w-4", filesQuery.isFetching && "animate-spin")} />
                    Refresh
                  </Button>
                </div>

                {filesQuery.isError ? (
                  <div className="text-sm text-red-600">Failed to load files.</div>
                ) : files.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No files uploaded yet.</div>
                ) : (
                  <div className="rounded-md border overflow-hidden min-w-0 max-w-full">
                    <Table
                      className="table-fixed w-full min-w-0"
                      containerClassName="overflow-x-hidden min-w-0 max-w-full"
                    >
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-18">Version</TableHead>
                          <TableHead className="min-w-0 w-[32%]">File</TableHead>
                          <TableHead className="min-w-0 w-[18%] max-w-32">Type</TableHead>
                          <TableHead className="w-20 text-right whitespace-nowrap">Size</TableHead>
                          <TableHead className="min-w-0 max-w-[28%] whitespace-normal leading-tight">
                            Uploaded
                          </TableHead>
                          <TableHead className="w-28 whitespace-nowrap text-right pr-1">
                            <span className="sr-only">Actions</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {files.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-mono text-xs">{f.version_no}</TableCell>
                            <TableCell className="font-medium max-w-0 min-w-0 overflow-hidden">
                              <EllipsisFileName name={f.file_name} className="font-medium" />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-0 min-w-0 overflow-hidden">
                              <span className="block truncate" title={f.mime_type}>{f.mime_type}</span>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                              {formatBytes(f.file_size_bytes)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-normal leading-snug max-w-44">
                              {formatDateTime(f.uploaded_at)}
                            </TableCell>
                            <TableCell className="w-28 p-1 text-right align-middle">
                              <div className="flex items-center justify-end gap-0.5 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="View document"
                                  onClick={() => viewSubmissionFile(f.id)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Download"
                                  onClick={() => downloadSubmissionFile(f.id, f.file_name)}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    title="Delete file"
                                    onClick={() => setFileToDelete(f)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments — Discussion thread (informal) */}
            <Card className="border-slate-200 bg-slate-50/50 dark:bg-slate-950/30 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Discussion
                  <Badge variant="secondary" className="text-xs font-normal">Comments</Badge>
                </CardTitle>
                <CardDescription>
                  {isReviewer ? (
                    <span>
                      Informal conversation about this submission.{" "}
                      <span className="font-medium text-foreground">
                        Comments do not approve, deny, or change status—use Formal review for that.
                      </span>
                    </span>
                  ) : (
                    <span>
                      Ask reviewers questions here.{" "}
                      <span className="font-medium text-foreground">
                        Discussion does not change your submission status; staff decides under Formal review.
                      </span>
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2">
                  <Textarea
                    rows={3}
                    placeholder={isReviewer ? "Note or question about this submission (does not finalize review)…" : "Question or note for reviewers (does not finalize review)…"}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={createCommentMutation.isPending}
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" variant="secondary" onClick={handlePostComment} disabled={createCommentMutation.isPending}>
                      {createCommentMutation.isPending ? "Posting…" : "Post comment"}
                    </Button>
                  </div>
                </div>

                {commentsQuery.isError ? (
                  <div className="text-sm text-red-600">Failed to load comments.</div>
                ) : comments.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">No comments yet. Start the conversation.</div>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => deleteCommentMutation.mutate(c.id)}
                            disabled={deleteCommentMutation.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {canReview && isApproved && (
              <Card className="border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/25 dark:border-emerald-800/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Formal review
                  </CardTitle>
                  <CardDescription>
                    No further Formal review is required—status is approved. Offices do not approve their own submissions; this decision was recorded by Admin/Staff earlier.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Review — Formal decision (changes status) */}
            {showFormalReview && (
              <Card className="border-2 border-blue-300 bg-linear-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 dark:border-blue-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
                      <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        Formal Review
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0">Decision</Badge>
                      </CardTitle>
                      <CardDescription>
                        <span className="font-medium text-foreground">Staff and administrators only:</span>
                        {" "}
                        this is the official step that approves, denies, or asks for revisions. Submitting notifies the submitting
                        office. This is separate from Discussion comments above.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Action</span>
                      <Select value={reviewAction} onValueChange={setReviewAction}>
                        <SelectTrigger className="border-blue-200 dark:border-blue-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APPROVE">Approve</SelectItem>
                          <SelectItem value="REQUEST_REVISION">Request revision</SelectItem>
                          <SelectItem value="DENY">Deny</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <span className="text-xs font-medium text-muted-foreground">Decision notes (optional)</span>
                      <Textarea
                        rows={3}
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        placeholder="Add notes that will be included in the notification."
                        className="border-blue-200 dark:border-blue-800"
                      />
                    </div>
                  </div>
                </CardContent>
                <DialogFooter className="px-6 pb-6">
                  <Button
                    onClick={handleReview}
                    disabled={reviewMutation.isPending}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Submit review
                  </Button>
                </DialogFooter>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Replace file confirmation modal */}
    <Dialog open={showReplaceConfirm} onOpenChange={(open) => { if (!open) setShowReplaceConfirm(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Replace Existing File?
          </DialogTitle>
          <DialogDescription className="pt-1 space-y-1">
            <span className="block">
              This submission already has a current file:{" "}
              <EllipsisFileName quoted name={currentFile?.file_name} className="font-medium text-foreground max-w-[min(100%,18rem)]" />
              .
            </span>
            <span className="block">
              Uploading{" "}
              <EllipsisFileName quoted name={fileToUpload?.name} className="font-medium text-foreground max-w-[min(100%,18rem)]" />{" "}
              will permanently delete the old file from storage. This cannot be undone.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setShowReplaceConfirm(false)}
            disabled={uploadMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            disabled={uploadMutation.isPending}
            onClick={() => {
              setShowReplaceConfirm(false);
              uploadMutation.mutate(fileToUpload);
            }}
          >
            {uploadMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading…</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" />Yes, Replace</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete file confirmation modal */}
    <Dialog open={Boolean(fileToDelete)} onOpenChange={(open) => { if (!open) setFileToDelete(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete File
          </DialogTitle>
          <DialogDescription className="pt-1 space-y-1">
            <span className="block">
              Are you sure you want to permanently delete{" "}
              <EllipsisFileName quoted name={fileToDelete?.file_name} className="font-medium text-foreground max-w-[min(100%,18rem)]" />
              ?
            </span>
            <span className="block">This will remove the file from storage and cannot be undone.</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setFileToDelete(null)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={async () => {
              if (!fileToDelete) return;
              setIsDeleting(true);
              try {
                await deleteSubmissionFile(fileToDelete.id);
                queryClient.invalidateQueries({ queryKey: ["submissions", "files", submissionId] });
                setFileToDelete(null);
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            {isDeleting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</>
            ) : (
              <><Trash2 className="mr-2 h-4 w-4" />Delete File</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

export default function SubmissionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();

  const currentYear = new Date().getFullYear();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [year, setYear] = useState(String(currentYear));
  const [yearOptions, setYearOptions] = useState([]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [detailSelection, setDetailSelection] = useState(null);

  // Drill-down: governance → office → submissions
  const [selectedGovernanceId, setSelectedGovernanceId] = useState(null);
  const [selectedOfficeId, setSelectedOfficeId] = useState(null);

  const canReview = ["ADMIN", "STAFF"].includes(String(user?.role || "").toUpperCase());

  // Support deep-links from governance area context:
  // /submissions?governanceAreaId=...&year=YYYY
  React.useEffect(() => {
    if (!canReview) return;
    const params = new URLSearchParams(location.search || "");
    const gid = params.get("governanceAreaId");
    const y = params.get("year");
    if (y && /^\d{4}$/.test(y)) {
      setYear(y);
    }
    if (gid) {
      setSelectedGovernanceId(gid);
      setSelectedOfficeId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReview, location.search]);

  const yearNum = year ? Number(year) : undefined;

  const governanceQuery = useQuery({
    queryKey: ["governance-areas", "stats", year],
    queryFn: () => getGovernanceAreasWithStats(yearNum || currentYear),
    enabled: Boolean(yearNum),
  });
  const governanceAreas = governanceQuery.data?.governanceAreas ?? [];

  const assignedOfficesQuery = useQuery({
    queryKey: ["governance-areas", selectedGovernanceId, "assigned-offices", year],
    queryFn: () => getAssignedOffices(selectedGovernanceId, yearNum || currentYear),
    enabled: Boolean(selectedGovernanceId) && Boolean(yearNum),
  });
  const assignedOffices = assignedOfficesQuery.data?.data ?? [];

  /** Tutorial auto-pick: prefer areas/offices with pending items, then any submissions, else first */
  const tourGovernanceId = useMemo(() => {
    if (!governanceAreas.length) return null;
    const pending = governanceAreas.find(
      (g) => Number(g.pending_review_count ?? 0) > 0
    );
    if (pending) return pending.id;
    const subs = governanceAreas.find(
      (g) => Number(g.submissions ?? 0) > 0
    );
    if (subs) return subs.id;
    return governanceAreas[0].id;
  }, [governanceAreas]);

  const tourOfficeId = useMemo(() => {
    if (!assignedOffices.length) return null;
    const pending = assignedOffices.find(
      (o) => Number(o.pending_review_count ?? 0) > 0
    );
    if (pending) return pending.office_id;
    return assignedOffices[0]?.office_id ?? null;
  }, [assignedOffices]);

  // For the final step, use the office checklist tree so we can include parent/root headers.
  const officeChecklistQuery = useQuery({
    queryKey: ["offices", selectedOfficeId, "checklist", year],
    queryFn: () => getOfficeChecklist(selectedOfficeId, yearNum || currentYear),
    enabled: Boolean(selectedGovernanceId) && Boolean(selectedOfficeId) && Boolean(yearNum),
  });
  const officeChecklistAreas = officeChecklistQuery.data?.data?.areas ?? [];
  const selectedArea = officeChecklistAreas.find((a) => a.id === selectedGovernanceId) || null;

  const submissionsQuery = useQuery({
    queryKey: ["submissions", "list", page, limit, year, status, selectedGovernanceId, selectedOfficeId],
    queryFn: () =>
      listSubmissions({
        page,
        limit,
        year: yearNum,
        status: status === "all" || status === "NO_SUBMISSION" ? undefined : status,
        governanceAreaId: canReview ? (selectedGovernanceId || undefined) : undefined,
        officeId: canReview ? (selectedOfficeId || undefined) : undefined,
      }),
    enabled: canReview ? (Boolean(selectedGovernanceId) && Boolean(selectedOfficeId)) : Boolean(yearNum),
    keepPreviousData: true,
  });

  /** Same query key as dashboard — reuse cache so root categories resolve without extra work */
  const officeChecklistSelfQuery = useQuery({
    queryKey: ["office-checklist", user?.officeId, yearNum ?? currentYear],
    queryFn: () => getOfficeChecklist(user.officeId, yearNum || currentYear),
    enabled: Boolean(!canReview && user?.officeId && yearNum),
    staleTime: 2 * 60 * 1000,
  });

  /** Map governance area code + item code → top-level (root) checklist row — for office submission list */
  const submissionRootByAreaAndItemCode = useMemo(() => {
    const areas = officeChecklistSelfQuery.data?.data?.areas ?? [];
    const map = new Map();
    for (const area of areas) {
      const rawItems = area.items ?? [];
      const byId = new Map(
        rawItems.map((it) => {
          const id = String(it.id);
          const rawParent = it.parentItemId ?? it.parent_item_id ?? it.parentId ?? null;
          const parentId =
            rawParent != null && rawParent !== "" ? String(rawParent) : null;
          return [id, { ...it, id, parentId }];
        })
      );
      const rootOfId = (itemId) => {
        let cur = byId.get(String(itemId));
        let root = cur;
        while (cur) {
          root = cur;
          cur = cur.parentId ? byId.get(cur.parentId) : null;
        }
        return root;
      };
      const areaCode = String(area.code ?? "");
      for (const it of rawItems) {
        const root = rootOfId(it.id);
        if (!root) continue;
        const code = String(it.itemCode ?? it.item_code ?? "");
        const key = `${areaCode}::${code}`;
        map.set(key, {
          rootCode: root.itemCode ?? root.item_code ?? "",
          rootTitle: root.title ?? "",
        });
      }
    }
    return map;
  }, [officeChecklistSelfQuery.data]);

  const rows = submissionsQuery.data?.data ?? [];
  const filteredRows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((r) => {
      const rootKey = `${String(r.governance_code ?? "")}::${String(r.item_code ?? "")}`;
      const root = submissionRootByAreaAndItemCode.get(rootKey);
      const rootHay = root ? `${root.rootCode} ${root.rootTitle}`.toLowerCase() : "";
      return (
        String(r.office_name || "").toLowerCase().includes(qq) ||
        String(r.governance_code || "").toLowerCase().includes(qq) ||
        String(r.item_code || "").toLowerCase().includes(qq) ||
        String(r.item_title || "").toLowerCase().includes(qq) ||
        rootHay.includes(qq)
      );
    });
  }, [rows, q, submissionRootByAreaAndItemCode]);

  const pagination = submissionsQuery.data?.pagination;

  // Load managed years for dropdown (with fallback)
  React.useEffect(() => {
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
  }, [currentYear]);

  const selectedGovernance = governanceAreas.find((g) => g.id === selectedGovernanceId);
  const selectedOffice = assignedOffices.find((o) => o.office_id === selectedOfficeId);

  const checklistRows = useMemo(() => {
    if (!selectedArea?.items?.length) return [];
    const items = selectedArea.items;

    const nodes = items.map((it) => {
      const id = String(it.id);
      const rawParent = it.parentItemId ?? it.parent_item_id ?? it.parentId ?? null;
      const parentId =
        rawParent != null && rawParent !== "" ? String(rawParent) : null;
      return {
        id,
        parentId,
        itemCode: it.itemCode ?? it.item_code,
        title: it.title,
        sortOrder: it.sortOrder ?? it.sort_order ?? 0,
        submission: it.submission,
        dueDate: it.dueDate ?? it.due_date,
        enableReminder: it.enableReminder ?? it.enable_reminder,
        reminderDaysBefore: it.reminderDaysBefore ?? it.reminder_days_before,
        children: [],
      };
    });

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const roots = [];
    for (const n of nodes) {
      if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId).children.push(n);
      else roots.push(n);
    }

    const sortFn = (a, b) => (a.sortOrder - b.sortOrder) || String(a.itemCode || "").localeCompare(String(b.itemCode || ""));
    const sortTree = (arr) => {
      arr.sort(sortFn);
      for (const x of arr) sortTree(x.children);
    };
    sortTree(roots);

    // Determine which leaf submissions to show (status filter + search),
    // then include all their ancestor headers so the table shows "root" context.
    const statusUpper = String(status || "all").toUpperCase();
    const qq = q.trim().toLowerCase();

    const haystackForNode = (node) => {
      const parts = [];
      let cur = node;
      while (cur) {
        parts.push(`${cur.itemCode || ""} ${cur.title || ""}`);
        cur = cur.parentId ? byId.get(cur.parentId) : null;
      }
      return parts.join(" ").toLowerCase();
    };

    const keepLeaf = (leaf) => {
      const isSubmitted = Boolean(leaf.submission?.id);

      if (statusUpper === "NO_SUBMISSION") {
        if (isSubmitted) return false;
      } else if (statusUpper !== "ALL") {
        if (!isSubmitted) return false;
        if (String(leaf.submission.status || "").toUpperCase() !== statusUpper) return false;
      }

      if (!qq) return true;
      return haystackForNode(leaf).includes(qq);
    };

    const needed = new Set();
    const addAncestors = (node) => {
      let cur = node;
      while (cur) {
        needed.add(cur.id);
        cur = cur.parentId ? byId.get(cur.parentId) : null;
      }
    };

    for (const n of nodes) {
      if (!n.children.length && keepLeaf(n)) addAncestors(n);
    }

    const out = [];
    const walk = (arr, depth = 0) => {
      for (const n of arr) {
        if (!needed.has(n.id)) continue;
        const isHeader = n.children.length > 0;
        out.push({ ...n, isHeader, depth });
        if (isHeader) walk(n.children, depth + 1);
      }
    };
    walk(roots, 0);

    return out;
  }, [selectedArea, status, q]);

  const handleYearChange = (v) => {
    setYear(v);
    setPage(1);
    setSelectedOfficeId(null);
  };

  const handleGovernanceSelect = (id) => {
    setSelectedGovernanceId(id);
    setSelectedOfficeId(null);
    setPage(1);
  };

  const handleOfficeSelect = (id) => {
    setSelectedOfficeId(id);
    setPage(1);
  };

  const tutorialSteps = useMemo(() => {
    if (!canReview) {
      return [
        {
          title: "Your submissions page",
          description: "This page shows all submissions from your office and their latest review status.",
          selector: '[data-tour-id="submissions-header"]',
          selectorLabel: "Submissions header",
        },
        {
          title: "Set year and refresh",
          description: "Change the reporting year and refresh to load the latest submission statuses.",
          selector: '[data-tour-id="submissions-header"]',
          selectorLabel: "Year selector and refresh",
        },
        {
          title: "Filter your list",
          description: "Use search and status filters to find specific governance items or review outcomes quickly.",
          selector: '[data-tour-id="submissions-office-filters"]',
          selectorLabel: "Office filters",
        },
        {
          title: "Open submission details",
          description: "Click any row to open files, comments, and full submission history in the details dialog.",
          selector: '[data-tour-id="submissions-office-table"]',
          selectorLabel: "Submissions table",
        },
      ];
    }

    return [
      {
        title: "Submission review workflow",
        description: "This page uses a 3-step drilldown: governance area, assigned office, then checklist submissions.",
        selector: '[data-tour-id="submissions-header"]',
        selectorLabel: "Submissions header",
      },
      {
        title: "Track your current path",
        description: "Use the breadcrumb to move back to governance or office level while reviewing.",
        selector: '[data-tour-id="submissions-breadcrumb"]',
        selectorLabel: "Review breadcrumb",
      },
      {
        title: "Choose a governance area",
        description:
          "Start by selecting a governance area. Areas with a blue badge show pending reviews; the tour’s next steps prefer an area that already has submission activity.",
        selector: '[data-tour-id="submissions-governance-level"]',
        selectorLabel: "Governance selection",
      },
      {
        title: "Choose an assigned office",
        description:
          "After selecting a governance area, pick an office. The tour automatically highlights an area with pending reviews when available, then an office that has items to review.",
        selector: '[data-tour-id="submissions-office-level"]',
        selectorLabel: "Office selection",
        preActionSelector: '[data-tour-id="submissions-tour-pick-governance"]',
      },
      {
        title: "Review checklist submissions",
        description:
          "Filter by status or keyword, then open each row to upload files, comment, and submit decisions. The tour picks an office with pending items when possible so this table shows real work.",
        selector: '[data-tour-id="submissions-review-level"]',
        selectorLabel: "Checklist review table",
        preActionSelector: '[data-tour-id="submissions-tour-pick-office"]',
      },
      {
        title: "Use breadcrumb to move back",
        description: "Use the breadcrumb to step back from office level to governance level without reloading the page.",
        selector: '[data-tour-id="submissions-breadcrumb"]',
        selectorLabel: "Breadcrumb navigation",
      },
    ];
  }, [canReview]);

  return (
    <div className="space-y-6" data-tour-id="submissions-root">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3" data-tour-id="submissions-header">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submissions</h1>
          <p className="text-muted-foreground">
            {canReview ? "Review by governance area → office → submissions" : "View your office submissions"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["submissions"] });
              queryClient.invalidateQueries({ queryKey: ["governance-areas"] });
              queryClient.invalidateQueries({ queryKey: ["office-checklist"] });
            }}
            disabled={submissionsQuery.isFetching}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", submissionsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* OFFICE view: flat submissions list + legend */}
      {!canReview && (
        <Card data-tour-id="submissions-office-table">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your submissions</CardTitle>
            <CardDescription>Track what you’ve submitted and its review status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Status legend */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium mr-1">Status legend:</span>
              <div className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Pending / waiting for approval
              </div>
              <div className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Not approved
              </div>
              <div className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Approved
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3" data-tour-id="submissions-office-filters">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by governance, item code, or title…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="DENIED">Not approved</SelectItem>
                  <SelectItem value="REVISION_REQUESTED">Pending (revision requested)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {submissionsQuery.isLoading ? (
              <div className="flex items-center justify-center py-14 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading submissions…
              </div>
            ) : submissionsQuery.isError ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
                <AlertCircle className="h-8 w-8 opacity-40" />
                <p className="text-sm">Failed to load submissions.</p>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
                <FileText className="h-8 w-8 opacity-40" />
                <p className="text-sm">No submissions found.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <div className="max-h-[60vh] overflow-auto">
                <Table className="min-w-[860px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Governance</TableHead>
                      <TableHead>Root category</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((s) => {
                      const root = submissionRootByAreaAndItemCode.get(
                        `${String(s.governance_code ?? "")}::${String(s.item_code ?? "")}`
                      );
                      return (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setDetailSelection({ kind: "submission", submissionId: s.id })}
                      >
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{s.governance_code}</Badge>
                        </TableCell>
                        <TableCell className="min-w-[160px] align-top">
                          {root ? (
                            <div className="min-w-0">
                              <Badge variant="secondary" className="font-mono text-[10px] mb-0.5">{root.rootCode}</Badge>
                              <p className="text-xs text-muted-foreground line-clamp-2" title={root.rootTitle}>{root.rootTitle}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {officeChecklistSelfQuery.isLoading ? "…" : "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[280px]">
                          <div className="min-w-0 flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate" title={s.item_title}>{s.item_title}</p>
                              <p className="text-xs text-muted-foreground truncate font-mono" title={s.item_code}>{s.item_code}</p>
                            </div>
                            <SubmissionDiscussionHint count={s.comment_count} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusPill status={s.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(s.submitted_at)}</TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ADMIN/STAFF view: drill-down */}
      {canReview && (
        <>
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-2 text-sm" data-tour-id="submissions-breadcrumb">
        <button
          type="button"
          onClick={() => { handleGovernanceSelect(null); setSelectedOfficeId(null); }}
          className="cursor-pointer text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          Governance areas
        </button>
        {selectedGovernance && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <button
              type="button"
              onClick={() => setSelectedOfficeId(null)}
              className="cursor-pointer text-muted-foreground hover:text-foreground font-medium transition-colors truncate max-w-[200px]"
            >
              {selectedGovernance.code} — {selectedGovernance.name}
            </button>
          </>
        )}
        {selectedOffice && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-foreground font-semibold truncate max-w-[180px]">{selectedOffice.office_name}</span>
          </>
        )}
      </nav>

      {/* Level 1: Governance areas */}
      {!selectedGovernanceId && (
        <Card className="border-l-4 border-l-blue-500 transition-all hover:shadow-md" data-tour-id="submissions-governance-level">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Folder className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base font-medium">Select a governance area</CardTitle>
                <CardDescription className="mt-0.5">Choose an area to see assigned offices and their submissions to review.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {governanceQuery.isLoading ? (
              <div className="flex items-center justify-center py-14 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading governance areas…
              </div>
            ) : governanceQuery.isError ? (
              <div className="py-14 text-center text-sm text-destructive rounded-lg bg-destructive/5 border border-destructive/20">Failed to load governance areas.</div>
            ) : governanceAreas.length === 0 ? (
              <div className="py-14 text-center text-sm text-muted-foreground rounded-lg border border-dashed">No governance areas.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {governanceAreas.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleGovernanceSelect(g.id)}
                    data-tour-id={tourGovernanceId && g.id === tourGovernanceId ? "submissions-tour-pick-governance" : undefined}
                    className="relative flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 cursor-pointer group"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                      <Folder className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Badge variant="outline" className="font-mono text-xs mb-1">{g.code}</Badge>
                      <p className="text-sm font-medium truncate">{g.name}</p>
                    </div>
                    {(Number(g.pending_review_count ?? 0) > 0) && (
                      <Badge className="absolute top-2 right-2 bg-blue-600 text-white rounded-full h-5 min-w-5 px-1.5 text-[10px] leading-none flex items-center justify-center font-bold">
                        {Number(g.pending_review_count ?? 0)}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Level 2: Offices assigned to selected governance */}
      {selectedGovernanceId && !selectedOfficeId && (
        <Card className="border-l-4 border-l-emerald-500 transition-all hover:shadow-md" data-tour-id="submissions-office-level">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base font-medium">Offices assigned to {selectedGovernance?.code}</CardTitle>
                <CardDescription className="mt-0.5">Select an office to view checklist items and review submissions for {year}.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {assignedOfficesQuery.isLoading ? (
              <div className="flex items-center justify-center py-14 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading offices…
              </div>
            ) : assignedOfficesQuery.isError ? (
              <div className="py-14 text-center text-sm text-destructive rounded-lg bg-destructive/5 border border-destructive/20">Failed to load offices.</div>
            ) : assignedOffices.length === 0 ? (
              <div className="py-14 text-center text-sm text-muted-foreground rounded-lg border border-dashed">No offices assigned to this governance area for {year}.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {assignedOffices.map((o) => (
                  <button
                    key={o.office_id}
                    type="button"
                    onClick={() => handleOfficeSelect(o.office_id)}
                    data-tour-id={tourOfficeId && o.office_id === tourOfficeId ? "submissions-tour-pick-office" : undefined}
                    className="relative flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 cursor-pointer group"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                      <Building2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Badge variant="outline" className="font-mono text-xs mb-1">{o.office_code}</Badge>
                      <p className="text-sm font-medium truncate">{o.office_name}</p>
                    </div>
                    {(Number(o.pending_review_count ?? 0) > 0) && (
                      <Badge className="absolute top-2 right-2 bg-emerald-600 text-white rounded-full h-5 min-w-5 px-1.5 text-[10px] leading-none flex items-center justify-center font-bold">
                        {Number(o.pending_review_count ?? 0)}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Level 3: Submissions to review for selected office */}
      {selectedGovernanceId && selectedOfficeId && (
        <Card className="border-l-4 border-l-rose-500 transition-all hover:shadow-md" data-tour-id="submissions-review-level">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50">
                <FileText className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <CardTitle className="text-base font-medium">Submissions to review</CardTitle>
                <CardDescription className="mt-0.5">
                  {selectedOffice?.office_name} · {selectedGovernance?.code} · {year}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs shrink-0">
              <span className="font-medium text-muted-foreground">Status:</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> No uploaded</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Pending</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Not approved</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" /> Approved</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by item code or title…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="NO_SUBMISSION">No Uploaded</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="DENIED">Denied</SelectItem>
                  <SelectItem value="REVISION_REQUESTED">Revision requested</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {officeChecklistQuery.isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground rounded-lg border border-dashed">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading checklist…
              </div>
            ) : officeChecklistQuery.isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive">
                <AlertCircle className="h-8 w-8 opacity-70" />
                <p className="text-sm font-medium">Failed to load checklist.</p>
              </div>
            ) : checklistRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-lg border border-dashed text-muted-foreground">
                <FileText className="h-8 w-8 opacity-50" />
                <p className="text-sm">No checklist items for this office.</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden shadow-sm">
                <div className="max-h-[62vh] overflow-auto">
                <Table className="table-fixed w-full min-w-[1040px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold w-[58%]">Item</TableHead>
                      <TableHead className="font-semibold w-[180px]">Status</TableHead>
                      <TableHead className="font-semibold w-[180px]">Reminder</TableHead>
                      <TableHead className="font-semibold w-[180px]">Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checklistRows.map((r) => {
                      const rowPad = 10 + r.depth * 18;
                      if (r.isHeader) {
                        return (
                          <TableRow
                            key={r.id}
                            className={cn(
                              "hover:bg-muted/25",
                              r.depth === 0 ? "bg-muted/55 border-t border-b border-border/80" : "bg-muted/25"
                            )}
                          >
                            <TableCell className="min-w-0 py-2.5 align-top">
                              <div
                                className="relative min-w-0 flex items-start gap-2"
                                style={{ paddingLeft: rowPad }}
                              >
                                {r.depth > 0 && (
                                  <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute text-muted-foreground/50"
                                    style={{ left: Math.max(0, rowPad - 14), top: "0.45rem", bottom: "0.45rem", width: 10 }}
                                  >
                                    <span className="absolute left-1/2 top-0 bottom-1/2 w-px bg-border -translate-x-1/2" />
                                    <span className="absolute left-1/2 top-1/2 right-0 h-px bg-border -translate-x-1/2" />
                                  </span>
                                )}
                                <Badge variant="secondary" className="font-mono text-xs font-bold shrink-0">
                                  {r.itemCode}
                                </Badge>
                                <div className="min-w-0 flex-1 space-y-0.5 pr-1">
                                  <p
                                    className={cn(
                                      "block min-w-0 truncate text-sm leading-5",
                                      r.depth === 0 ? "font-extrabold text-foreground" : "font-semibold text-foreground/90"
                                    )}
                                    title={r.title}
                                  >
                                    {r.title}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="align-top" />
                            <TableCell className="align-top" />
                            <TableCell className="align-top" />
                          </TableRow>
                        );
                      }

                      const s = r.submission;
                      return (
                        <TableRow
                          key={r.id}
                          className="transition-colors cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            if (s?.id) {
                              setDetailSelection({ kind: "submission", submissionId: s.id });
                              return;
                            }
                            setDetailSelection({
                              kind: "pending",
                              checklistItemId: r.id,
                              officeId: selectedOfficeId,
                              year: yearNum || currentYear,
                              governanceCode: selectedGovernance?.code ?? "",
                              itemCode: r.itemCode ?? "",
                              itemTitle: r.title ?? "",
                              officeName: selectedOffice?.office_name ?? "",
                            });
                          }}
                        >
                          <TableCell className="min-w-0 py-2.5 align-top">
                            <div
                              className="relative min-w-0 flex items-start gap-2"
                              style={{ paddingLeft: rowPad }}
                            >
                              {r.depth > 0 && (
                                <span
                                  aria-hidden="true"
                                  className="pointer-events-none absolute text-muted-foreground/50"
                                  style={{ left: Math.max(0, rowPad - 14), top: "0.55rem", bottom: "0.25rem", width: 10 }}
                                >
                                  <span className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />
                                  <span className="absolute left-1/2 top-1/2 right-0 h-px bg-border -translate-x-1/2" />
                                </span>
                              )}
                              <div className="min-w-0 flex-1 space-y-0.5 pr-1">
                                <p className="block min-w-0 truncate text-sm font-medium leading-5" title={r.title}>
                                  {r.title}
                                </p>
                                {r.itemCode ? (
                                  <p className="block min-w-0 truncate text-xs leading-4 text-muted-foreground font-mono" title={r.itemCode}>
                                    {r.itemCode}
                                  </p>
                                ) : null}
                              </div>
                              <SubmissionDiscussionHint count={s?.commentCount} />
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 align-top whitespace-nowrap">
                            {s?.status ? <StatusPill status={s.status} compact /> : <NoSubmissionPill />}
                          </TableCell>
                          <TableCell className="py-2.5 align-top whitespace-nowrap text-right">
                            <div className="inline-flex justify-end min-w-full">
                              <ReminderCell item={r} submissionStatus={s?.status} />
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 align-top whitespace-nowrap text-xs text-muted-foreground">
                            {s?.submittedAt ? formatDateTime(s.submittedAt) : "Not submitted"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </>
      )}

      <SubmissionDetailsDialog
        selection={detailSelection}
        open={detailSelection != null}
        onClose={() => setDetailSelection(null)}
        onPromoteToSubmission={(submissionId) =>
          setDetailSelection({ kind: "submission", submissionId })
        }
      />

      <HelpTourOverlay steps={tutorialSteps} buttonLabel="Submissions page help" />
    </div>
  );
}
