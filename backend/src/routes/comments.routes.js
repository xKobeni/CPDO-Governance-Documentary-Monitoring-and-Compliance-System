import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { audit } from "../middlewares/audit.js";
import { shortCache } from "../middlewares/caching.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  createCommentHandler,
  getCommentsHandler,
  deleteCommentHandler,
} from "../controllers/comments.controller.js";

const r = Router({ mergeParams: true }); // mergeParams to access :submissionId

r.use(requireAuth);

// Get all comments for a submission
r.get("/", shortCache, asyncHandler(getCommentsHandler));

// Create a comment
r.post("/", audit("CREATE_COMMENT", "SUBMISSION_COMMENT", (req) => req.params.submissionId), asyncHandler(createCommentHandler));

// Delete a comment
r.delete("/:commentId", audit("DELETE_COMMENT", "SUBMISSION_COMMENT", (req) => req.params.commentId), asyncHandler(deleteCommentHandler));

export default r;
