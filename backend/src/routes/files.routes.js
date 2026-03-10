import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";
import { audit } from "../middlewares/audit.js";
import { shortCache } from "../middlewares/caching.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  uploadSubmissionFileHandler,
  listSubmissionFilesHandler
} from "../controllers/files.controller.js";

const r = Router();

r.use(requireAuth);

r.get("/:submissionId", shortCache, asyncHandler(listSubmissionFilesHandler));
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