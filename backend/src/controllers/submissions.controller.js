import { z } from "zod";
import { pool } from "../config/db.js";
import {
  createSubmission, getSubmissionById, listSubmissions, setSubmissionStatus
} from "../models/submissions.model.js";
import { createReview, addVerificationCheck, listReviews } from "../models/reviews.model.js";
import { createNotification, createNotificationsBulk } from "../models/notifications.model.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";

const createSubmissionSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  officeId: z.string().uuid(),
  checklistItemId: z.string().uuid(),
  officeRemarks: z.string().nullable().optional(),
});

/**
 * We need governance_area_id + template_id from the checklist_item.
 * We derive them safely from DB.
 */
export async function createSubmissionHandler(req, res) {
  const parsed = createSubmissionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });

  const { year, officeId, checklistItemId, officeRemarks } = parsed.data;

  // OFFICE users can only submit for their own office
  if (req.user.role === "OFFICE" && req.user.officeId !== officeId) {
    return res.status(403).json({ message: "OFFICE users can only submit for their office" });
  }

  const { rows } = await pool.query(
    `SELECT ci.id as checklist_item_id, ci.template_id, t.governance_area_id, t.year
     FROM checklist_items ci
     JOIN checklist_templates t ON t.id = ci.template_id
     WHERE ci.id = $1`,
    [checklistItemId]
  );
  const ref = rows[0];
  if (!ref) return res.status(404).json({ message: "Checklist item not found" });
  if (ref.year !== year) return res.status(400).json({ message: "Checklist item template year mismatch" });

  // Block re-submission if a PENDING or APPROVED submission already exists
  const { rows: existing } = await pool.query(
    `SELECT id, status FROM submissions
     WHERE year = $1 AND office_id = $2 AND checklist_item_id = $3
     LIMIT 1`,
    [year, officeId, checklistItemId]
  );
  if (existing.length > 0) {
    const s = existing[0].status;
    if (s === "PENDING") {
      return res.status(409).json({ message: "A submission for this item is already pending review. Please wait for a decision before resubmitting." });
    }
    if (s === "APPROVED") {
      return res.status(409).json({ message: "This submission has already been approved and cannot be replaced." });
    }
  }

  const submission = await createSubmission({
    year,
    officeId,
    governanceAreaId: ref.governance_area_id,
    templateId: ref.template_id,
    checklistItemId,
    submittedBy: req.user.sub,
    officeRemarks: officeRemarks ?? null,
  });
  // For OFFICE users, notify all ADMIN/STAFF that a new submission was created,
  // so they see something even before any files are uploaded.
  if (req.user.role === "OFFICE") {
    const full = await getSubmissionById(submission.id);
    const { rows: staffUsers } = await pool.query(
      `SELECT DISTINCT u.id
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.code IN ('ADMIN', 'STAFF')
         AND u.is_active = TRUE`,
      []
    );

    const notifications = staffUsers.map(user => ({
      userId: user.id,
      type: "SUBMISSION_RECEIVED",
      title: `New submission - ${full?.office_name ?? "Office"}`,
      body: full
        ? `${full.item_title} (${full.governance_code}) from ${full.office_name}`
        : `A new submission was created by an office user.`,
      linkSubmissionId: submission.id,
    }));
    if (notifications.length > 0) {
      await createNotificationsBulk(notifications);
    }
  }

  return res.status(201).json({ submission });
}

export async function getSubmissionHandler(req, res) {
  const submission = await getSubmissionById(req.params.id);
  if (!submission) return res.status(404).json({ message: "Submission not found" });

  // OFFICE users can only view their office submissions
  if (req.user.role === "OFFICE" && submission.office_id !== req.user.officeId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return res.json({ submission });
}

export async function listReviewsHandler(req, res) {
  const submission = await getSubmissionById(req.params.id);
  if (!submission) return res.status(404).json({ message: "Submission not found" });
  if (req.user.role === "OFFICE" && submission.office_id !== req.user.officeId) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const reviews = await listReviews(req.params.id);
  return res.json({ reviews });
}

export async function listSubmissionsHandler(req, res) {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const governanceAreaId = req.query.governanceAreaId || undefined;
  const status = req.query.status || undefined;

  let officeId = req.query.officeId || undefined;
  if (req.user.role === "OFFICE") officeId = req.user.officeId;

  const { limit, offset, page } = getPaginationParams(req, 20, 100);
  const { rows, total } = await listSubmissions({ year, governanceAreaId, officeId, status }, limit, offset);
  return res.json(formatPaginatedResponse(rows, total, page, limit));
}

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "DENY", "REQUEST_REVISION"]),
  decisionNotes: z.string().nullable().optional(),
  verificationChecks: z.array(z.object({
    checkKey: z.string().min(1),
    isPassed: z.boolean(),
    notes: z.string().nullable().optional(),
  })).optional(),
});

export async function reviewSubmissionHandler(req, res) {
  const submissionId = req.params.id;
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });

  const submission = await getSubmissionById(submissionId);
  if (!submission) return res.status(404).json({ message: "Submission not found" });

  if (submission.status === "APPROVED") {
    return res.status(400).json({ message: "This submission is already approved." });
  }

  const review = await createReview({
    submissionId,
    reviewedBy: req.user.sub,
    action: parsed.data.action,
    decisionNotes: parsed.data.decisionNotes ?? null,
  });

  if (parsed.data.verificationChecks?.length) {
    for (const c of parsed.data.verificationChecks) {
      await addVerificationCheck({
        reviewId: review.id,
        checkKey: c.checkKey,
        isPassed: c.isPassed,
        notes: c.notes ?? null,
      });
    }
  }

  // Update submission.status accordingly
  const newStatus =
    parsed.data.action === "APPROVE" ? "APPROVED" :
    parsed.data.action === "DENY" ? "DENIED" :
    "REVISION_REQUESTED";

  await setSubmissionStatus({ submissionId, status: newStatus });

  // Create notification for the office user(s) who submitted
  const notificationType = 
    parsed.data.action === "APPROVE" ? "APPROVED" :
    parsed.data.action === "DENY" ? "DENIED" :
    "REVISION_REQUESTED";

  const notificationTitle = 
    parsed.data.action === "APPROVE" ? "Submission Approved" :
    parsed.data.action === "DENY" ? "Submission Denied" :
    "Revision Requested";

  const notificationBody = parsed.data.decisionNotes || 
    `Your submission for ${submission.item_title} has been ${notificationTitle.toLowerCase()}.`;

  // Notify the user who submitted (if not the reviewer)
  if (submission.submitted_by !== req.user.sub) {
    await createNotification({
      userId: submission.submitted_by,
      type: notificationType,
      title: notificationTitle,
      body: notificationBody,
      linkSubmissionId: submissionId,
    });
  }

  // Notify other STAFF/ADMIN users (optional - so they know it's been reviewed)
  // Get all ADMIN and STAFF users
  const { rows: staffUsers } = await pool.query(
    `SELECT DISTINCT u.id FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.code IN ('ADMIN', 'STAFF')
     AND u.id != $1
     AND u.is_active = TRUE`,
    [req.user.sub]
  );

  const notifications = staffUsers.map(user => ({
    userId: user.id,
    type: notificationType,
    title: `${notificationTitle} - ${submission.office_name}`,
    body: `${submission.item_title} from ${submission.office_name}`,
    linkSubmissionId: submissionId,
  }));
  if (notifications.length > 0) {
    await createNotificationsBulk(notifications);
  }

  return res.json({ review, status: newStatus });
}