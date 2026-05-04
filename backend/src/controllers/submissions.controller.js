import { z } from "zod";
import { pool } from "../config/db.js";
import {
  createSubmission, getSubmissionById, listSubmissions
} from "../models/submissions.model.js";
import { listReviews } from "../models/reviews.model.js";
import { notifyOfficeOpenedSubmission, notifyReviewDecision } from "../services/submission-notifications.service.js";
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
    `SELECT
       ci.id as checklist_item_id,
       ci.template_id,
       ci.is_active as item_is_active,
       t.governance_area_id,
       t.year,
       t.status as template_status
     FROM checklist_items ci
     JOIN checklist_templates t ON t.id = ci.template_id
     WHERE ci.id = $1`,
    [checklistItemId]
  );
  const ref = rows[0];
  if (!ref) return res.status(404).json({ message: "Checklist item not found" });
  if (ref.year !== year) return res.status(400).json({ message: "Checklist item template year mismatch" });
  if (!ref.item_is_active) {
    return res.status(409).json({ message: "This checklist item is inactive and cannot accept submissions" });
  }
  if (ref.template_status !== "ACTIVE") {
    return res.status(409).json({ message: "This checklist template is not active and cannot accept submissions" });
  }

  // Enforce governance assignment: office can only submit items
  // under areas assigned to it for the given year.
  const { rows: assignmentRows } = await pool.query(
    `SELECT 1
     FROM office_governance_assignments
     WHERE office_id = $1
       AND governance_area_id = $2
       AND year = $3
     LIMIT 1`,
    [officeId, ref.governance_area_id, year]
  );
  if (assignmentRows.length === 0) {
    return res.status(403).json({ message: "This governance area is not assigned to the office for the selected year" });
  }

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
  if (!submission) {
    // Concurrency-safe guard: another request/process may have changed
    // the submission status after our pre-check.
    const { rows: latestRows } = await pool.query(
      `SELECT status
       FROM submissions
       WHERE year = $1 AND office_id = $2 AND checklist_item_id = $3
       LIMIT 1`,
      [year, officeId, checklistItemId]
    );
    const latest = latestRows[0];
    if (latest?.status === "PENDING") {
      return res.status(409).json({ message: "A submission for this item is already pending review. Please wait for a decision before resubmitting." });
    }
    if (latest?.status === "APPROVED") {
      return res.status(409).json({ message: "This submission has already been approved and cannot be replaced." });
    }
    return res.status(409).json({ message: "Submission could not be created due to a concurrent update. Please retry." });
  }
  if (req.user.role === "OFFICE") {
    const full = await getSubmissionById(submission.id);
    await notifyOfficeOpenedSubmission({
      submissionId: submission.id,
      officeName: full?.office_name ?? "Office",
      itemTitle: full?.item_title ?? "Checklist item",
      governanceCode: full?.governance_code ?? "",
    });
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
  if (req.query.year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
    return res.status(400).json({ message: "year must be a valid integer between 2000 and 2100" });
  }
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

  // Update submission.status accordingly
  const newStatus =
    parsed.data.action === "APPROVE" ? "APPROVED" :
    parsed.data.action === "DENY" ? "DENIED" :
    "REVISION_REQUESTED";
  let review;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: lockedRows } = await client.query(
      `SELECT id, status
       FROM submissions
       WHERE id = $1
       FOR UPDATE`,
      [submissionId]
    );
    const locked = lockedRows[0];
    if (!locked) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Submission not found" });
    }
    if (locked.status === "APPROVED") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "This submission is already approved." });
    }

    const { rows: reviewRows } = await client.query(
      `INSERT INTO reviews (submission_id, reviewed_by, action, decision_notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [submissionId, req.user.sub, parsed.data.action, parsed.data.decisionNotes ?? null]
    );
    review = reviewRows[0];

    if (parsed.data.verificationChecks?.length) {
      for (const c of parsed.data.verificationChecks) {
        await client.query(
          `INSERT INTO verification_checks (review_id, check_key, is_passed, notes)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (review_id, check_key)
           DO UPDATE SET is_passed = EXCLUDED.is_passed, notes = EXCLUDED.notes`,
          [review.id, c.checkKey, c.isPassed, c.notes ?? null]
        );
      }
    }

    await client.query(
      `UPDATE submissions
       SET status = $2
       WHERE id = $1`,
      [submissionId, newStatus]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

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

  await notifyReviewDecision({
    submissionId,
    officeId: submission.office_id,
    reviewerUserId: req.user.sub,
    reviewerRole: req.user.role,
    notificationType,
    officeTitle: notificationTitle,
    officeBody: notificationBody,
    officeName: submission.office_name,
    itemTitle: submission.item_title,
  });

  return res.json({ review, status: newStatus });
}