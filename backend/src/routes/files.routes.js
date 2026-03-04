import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";
import { audit } from "../middlewares/audit.js";
import { shortCache } from "../middlewares/caching.js";
import {
  uploadSubmissionFileHandler,
  listSubmissionFilesHandler
} from "../controllers/files.controller.js";

const r = Router();

r.use(requireAuth);

r.get("/:submissionId", shortCache, listSubmissionFilesHandler);
r.post(
  "/:submissionId/upload",
  upload.single("file"),
  audit("UPLOAD_FILE", "SUBMISSION", (req) => req.params.submissionId),
  uploadSubmissionFileHandler
);

export default r;