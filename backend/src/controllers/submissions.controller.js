import { z } from "zod";
import { pool } from "../config/db.js";
import {
  createSubmission, getSubmissionById, listSubmissions, setSubmissionStatus
} from "../models/submissions.model.js";
import { createReview, addVerificationCheck } from "../models/reviews.model.js";
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

  const submission = await createSubmission({
    year,
    officeId,
    governanceAreaId: ref.governance_area_id,
    templateId: ref.template_id,
    checklistItemId,
    submittedBy: req.user.sub,
    officeRemarks: officeRemarks ?? null,
  });

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

  return res.json({ review, status: newStatus });
}