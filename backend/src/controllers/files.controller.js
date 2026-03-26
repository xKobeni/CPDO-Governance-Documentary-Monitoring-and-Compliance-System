import path from "path";
import fs from "fs/promises";
import { getSubmissionById } from "../models/submissions.model.js";
import { addNewFileVersion, listFiles, getUserTotalUploadedBytes } from "../models/submissionFiles.model.js";
import { touchSubmissionSubmittedBy } from "../models/submissions.model.js";
import { createNotification, createNotificationsBulk } from "../models/notifications.model.js";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";

async function cleanupTempUpload(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
  }
}

export async function listSubmissionFilesHandler(req, res) {
  const submissionId = req.params.submissionId;
  const submission = await getSubmissionById(submissionId);
  if (!submission) return res.status(404).json({ message: "Submission not found" });

  if (req.user.role === "OFFICE" && submission.office_id !== req.user.officeId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const files = await listFiles(submissionId);
  return res.json({ files });
}

export async function uploadSubmissionFileHandler(req, res) {
  const submissionId = req.params.submissionId;
  const submission = await getSubmissionById(submissionId);
  if (!submission) return res.status(404).json({ message: "Submission not found" });

  // OFFICE restriction
  if (req.user.role === "OFFICE" && submission.office_id !== req.user.officeId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Lock rule: if approved, only allow upload if revision requested
  if (submission.status === "APPROVED") {
    return res.status(409).json({ message: "Submission is approved and locked" });
  }

  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  // Ensure the submission has a submitter when OFFICE uploads evidence.
  // This also guarantees review notifications later have a valid recipient.
  if (req.user.role === "OFFICE") {
    await touchSubmissionSubmittedBy({ submissionId, submittedBy: req.user.sub });
  }

  // Validate file extension against the checklist item's allowed_file_types
  const allowedTypes = submission.allowed_file_types; // TEXT[] from DB, e.g. ['pdf','docx']
  if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
    const ext = path.extname(req.file.originalname).toLowerCase().replace(/^\./, '');
    const normalised = allowedTypes.map((t) => t.toLowerCase().replace(/^\./, ''));
    if (!normalised.includes(ext)) {
      await cleanupTempUpload(req.file.path);
      return res.status(422).json({
        message: `File type not accepted. Allowed: ${normalised.map((t) => `.${t}`).join(', ')}`,
        allowedTypes: normalised,
      });
    }
  }

  const totalUploaded = await getUserTotalUploadedBytes(req.user.sub);
  const projectedTotal = totalUploaded + req.file.size;
  if (projectedTotal > env.uploadQuotaBytes) {
    await cleanupTempUpload(req.file.path);
    return res.status(413).json({
      message: "Storage quota exceeded",
      quotaBytes: env.uploadQuotaBytes,
    });
  }

  const storedKey = path.join("uploads", req.file.filename).replace(/\\/g, "/");

  const fileRow = await addNewFileVersion({
    submissionId,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSizeBytes: req.file.size,
    storageKey: storedKey,
    sha256: null,
    uploadedBy: req.user.sub,
  });

  // Notify STAFF/ADMIN that an OFFICE uploaded/updated evidence.
  if (req.user.role === "OFFICE") {
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
      title: `New submission file - ${submission.office_name}`,
      body: `${submission.item_title}: ${req.file.originalname}`,
      linkSubmissionId: submissionId,
    }));
    if (notifications.length > 0) {
      await createNotificationsBulk(notifications);
    }
  }

  return res.status(201).json({ file: fileRow });
}