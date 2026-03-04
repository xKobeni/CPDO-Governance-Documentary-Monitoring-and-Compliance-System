import { z } from "zod";
import { createComment, getSubmissionComments, getCommentById, deleteComment } from "../models/comments.model.js";
import { getSubmissionById } from "../models/submissions.model.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";

const createCommentSchema = z.object({
  comment: z.string().min(1).max(5000),
});

/**
 * Create a comment on a submission
 */
export async function createCommentHandler(req, res) {
  const submissionId = req.params.submissionId;
  const parsed = createCommentSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
  }

  // Verify submission exists
  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    return res.status(404).json({ message: "Submission not found" });
  }

  // OFFICE users can only comment on their own office's submissions
  if (req.user.role === "OFFICE" && submission.office_id !== req.user.officeId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const comment = await createComment({
    submissionId,
    authorUserId: req.user.sub,
    comment: parsed.data.comment,
  });

  return res.status(201).json({ comment });
}

/**
 * Get all comments for a submission
 */
export async function getCommentsHandler(req, res) {
  const submissionId = req.params.submissionId;

  // Verify submission exists
  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    return res.status(404).json({ message: "Submission not found" });
  }

  // OFFICE users can only view comments on their own office's submissions
  if (req.user.role === "OFFICE" && submission.office_id !== req.user.officeId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { limit, offset, page } = getPaginationParams(req, 50, 100);
  const { comments, total } = await getSubmissionComments(submissionId, limit, offset);

  return res.json(formatPaginatedResponse(comments, total, page, limit));
}

/**
 * Delete a comment (only author can delete)
 */
export async function deleteCommentHandler(req, res) {
  const commentId = req.params.commentId;

  const comment = await getCommentById(commentId);
  if (!comment) {
    return res.status(404).json({ message: "Comment not found" });
  }

  // Only author can delete their own comment
  if (comment.author_user_id !== req.user.sub) {
    return res.status(403).json({ message: "Only the author can delete this comment" });
  }

  await deleteComment(commentId);
  return res.json({ ok: true });
}
