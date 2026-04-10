import path from "path";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { b2Client } from "../config/b2.js";
import { getSubmissionById } from "../models/submissions.model.js";
import {
  addNewFileVersion,
  listFiles,
  getUserTotalUploadedBytes,
  getSubmissionFileById,
  deleteFileRecord,
  getAllFileExplorerData,
} from "../models/submissionFiles.model.js";
import { touchSubmissionSubmittedBy } from "../models/submissions.model.js";
import { createNotificationsBulk } from "../models/notifications.model.js";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";

export async function getFileExplorerHandler(req, res) {
  // Only ADMIN and STAFF should be able to reach this based on the route middleware, 
  // but let's be double sure.
  if (req.user.role !== "ADMIN" && req.user.role !== "STAFF") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const files = await getAllFileExplorerData();
  return res.json({ files });
}

async function cleanupB2Upload(key) {
  if (!key) return;
  try {
    await b2Client.send(new DeleteObjectCommand({
      Bucket: env.b2BucketName,
      Key: key,
    }));
  } catch {
    // Cleanup failure should not mask the original error
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

  if (req.user.role === "OFFICE" && submission.office_id !== req.user.officeId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (submission.status === "APPROVED") {
    return res.status(409).json({ message: "Submission is approved and locked" });
  }

  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  if (req.user.role === "OFFICE") {
    await touchSubmissionSubmittedBy({ submissionId, submittedBy: req.user.sub });
  }

  // Validate against checklist's allowed_file_types (file is already in B2 at this point)
  const allowedTypes = submission.allowed_file_types;
  if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
    const ext = path.extname(req.file.originalname).toLowerCase().replace(/^\./, "");
    const normalised = allowedTypes.map((t) => t.toLowerCase().replace(/^\./, ""));
    if (!normalised.includes(ext)) {
      await cleanupB2Upload(req.file.key);
      return res.status(422).json({
        message: `File type not accepted. Allowed: ${normalised.map((t) => `.${t}`).join(", ")}`,
        allowedTypes: normalised,
      });
    }
  }

  const totalUploaded = await getUserTotalUploadedBytes(req.user.sub);
  const projectedTotal = totalUploaded + req.file.size;
  if (projectedTotal > env.uploadQuotaBytes) {
    await cleanupB2Upload(req.file.key);
    return res.status(413).json({
      message: "Storage quota exceeded",
      quotaBytes: env.uploadQuotaBytes,
    });
  }

  // Capture the current file's B2 key before it gets replaced
  const existingFiles = await listFiles(submissionId);
  const previousCurrent = existingFiles.find((f) => f.is_current) ?? null;

  const fileRow = await addNewFileVersion({
    submissionId,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSizeBytes: req.file.size,
    storageKey: req.file.key,
    sha256: null,
    uploadedBy: req.user.sub,
  });

  const isReplacement = Boolean(previousCurrent);

  // Delete the previous version from B2 now that the new one is saved
  if (previousCurrent?.storage_key) {
    await cleanupB2Upload(previousCurrent.storage_key);
  }

  if (req.user.role === "OFFICE") {
    if (isReplacement) {
      // Replacement — notify ADMIN only with a distinct message
      const { rows: admins } = await pool.query(
        `SELECT DISTINCT u.id
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.code = 'ADMIN'
           AND u.is_active = TRUE`
      );

      const notifications = admins.map((u) => ({
        userId: u.id,
        type: "FILE_REPLACED",
        title: `File replaced - ${submission.office_name}`,
        body: `${submission.item_title}: "${previousCurrent.file_name}" was replaced with "${req.file.originalname}"`,
        linkSubmissionId: submissionId,
      }));
      if (notifications.length > 0) {
        await createNotificationsBulk(notifications);
      }
    } else {
      // First-time upload — notify ADMIN + STAFF
      const { rows: staffUsers } = await pool.query(
        `SELECT DISTINCT u.id
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.code IN ('ADMIN', 'STAFF')
           AND u.is_active = TRUE`
      );

      const notifications = staffUsers.map((u) => ({
        userId: u.id,
        type: "SUBMISSION_RECEIVED",
        title: `New submission file - ${submission.office_name}`,
        body: `${submission.item_title}: ${req.file.originalname}`,
        linkSubmissionId: submissionId,
      }));
      if (notifications.length > 0) {
        await createNotificationsBulk(notifications);
      }
    }
  }

  return res.status(201).json({ file: fileRow });
}

export async function deleteSubmissionFileHandler(req, res) {
  const file = await getSubmissionFileById(req.params.fileId);
  if (!file) return res.status(404).json({ message: "File not found" });

  const deleted = await deleteFileRecord(req.params.fileId);
  if (!deleted) return res.status(404).json({ message: "File not found" });

  // Remove from B2 — best-effort, don't fail the request if cleanup errors
  await cleanupB2Upload(deleted.storage_key);

  return res.json({ message: "File deleted", fileId: deleted.id });
}

export async function downloadSubmissionFileHandler(req, res) {
  const file = await getSubmissionFileById(req.params.fileId);
  if (!file) return res.status(404).json({ message: "File not found" });

  if (req.user.role === "OFFICE" && file.office_id !== req.user.officeId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const command = new GetObjectCommand({
    Bucket: env.b2BucketName,
    Key: file.storage_key,
  });

  const s3Response = await b2Client.send(command);

  res.setHeader("Content-Type", file.mime_type);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(file.file_name)}"`
  );
  if (s3Response.ContentLength) {
    res.setHeader("Content-Length", s3Response.ContentLength);
  }

  s3Response.Body.on("error", () => {
    if (!res.headersSent) {
      res.status(502).json({ message: "Error streaming file from storage" });
    }
  });

  s3Response.Body.pipe(res);
}
