import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { upload } from "../middlewares/upload.js";
import { audit } from "../middlewares/audit.js";
import { shortCache } from "../middlewares/caching.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  uploadSubmissionFileHandler,
  listSubmissionFilesHandler,
  downloadSubmissionFileHandler,
  deleteSubmissionFileHandler,
  getFileExplorerHandler,
} from "../controllers/files.controller.js";

const r = Router();

r.use(requireAuth, checkSessionInactivity);

r.get("/explorer", requireRole("ADMIN", "STAFF"), shortCache, asyncHandler(getFileExplorerHandler));
r.get("/:submissionId", shortCache, asyncHandler(listSubmissionFilesHandler));
r.get("/:fileId/download", asyncHandler(downloadSubmissionFileHandler));
r.delete(
  "/:fileId",
  requireRole("ADMIN"),
  audit("DELETE_FILE", "SUBMISSION", (req) => req.params.fileId, (req) => ({ fileId: req.params.fileId })),
  asyncHandler(deleteSubmissionFileHandler)
);
r.post(
  "/:submissionId/upload",
  upload.single("file"),
  audit("UPLOAD_FILE", "SUBMISSION", (req) => req.params.submissionId, (req) => ({ 
    fileName: req.file?.originalname, 
    fileSize: req.file?.size,
    submissionId: req.params.submissionId 
  })),
  asyncHandler(uploadSubmissionFileHandler)
);

export default r;