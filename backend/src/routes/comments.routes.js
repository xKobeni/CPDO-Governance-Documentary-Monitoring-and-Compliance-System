import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { audit } from "../middlewares/audit.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  createCommentHandler,
  getCommentsHandler,
  deleteCommentHandler,
} from "../controllers/comments.controller.js";

const r = Router({ mergeParams: true }); // mergeParams to access :submissionId

r.use(requireAuth, checkSessionInactivity);

// Get all comments — no cache so new comments show immediately after posting
const noCache = (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  next();
};
r.get("/", noCache, asyncHandler(getCommentsHandler));

// Create a comment
r.post("/", audit("CREATE_COMMENT", "SUBMISSION_COMMENT", (req) => req.params.submissionId, (req) => ({ content: req.body.content?.substring(0,100) + '...', submissionId: req.params.submissionId })), asyncHandler(createCommentHandler));

// Delete a comment
r.delete("/:commentId", audit("DELETE_COMMENT", "SUBMISSION_COMMENT", (req) => req.params.commentId, (req) => ({ commentId: req.params.commentId, submissionId: req.params.submissionId })), asyncHandler(deleteCommentHandler));

export default r;
