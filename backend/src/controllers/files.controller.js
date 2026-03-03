import path from "path";
import { getSubmissionById } from "../models/submissions.model.js";
import { addNewFileVersion, listFiles } from "../models/submissionFiles.model.js";

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

  return res.status(201).json({ file: fileRow });
}