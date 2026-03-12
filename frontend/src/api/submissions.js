import api from "../lib/axios";

// ── Submissions ───────────────────────────────────────────────────────────────

export async function listSubmissions(params = {}) {
  const response = await api.get("/submissions", { params });
  return response.data; // { data: [...], pagination: {...} }
}

export async function getSubmission(submissionId) {
  const response = await api.get(`/submissions/${submissionId}`);
  return response.data; // { submission: {...} }
}

export async function createSubmission(payload) {
  const response = await api.post("/submissions", payload);
  return response.data; // { submission: {...} }
}

export async function reviewSubmission(submissionId, payload) {
  const response = await api.post(`/submissions/${submissionId}/review`, payload);
  return response.data; // { review: {...}, status: "APPROVED"|"DENIED"|"REVISION_REQUESTED" }
}

// ── Files (submission evidence) ───────────────────────────────────────────────

export async function listSubmissionFiles(submissionId) {
  const response = await api.get(`/files/${submissionId}`);
  return response.data; // { files: [...] }
}

export async function uploadSubmissionFile(submissionId, file) {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post(`/files/${submissionId}/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { file: {...} }
}

// ── Comments (nested under submission) ────────────────────────────────────────

export async function listSubmissionComments(submissionId, params = {}) {
  const response = await api.get(`/submissions/${submissionId}/comments`, { params });
  return response.data; // { data: [...], pagination: {...} }
}

export async function createSubmissionComment(submissionId, comment) {
  const response = await api.post(`/submissions/${submissionId}/comments`, { comment });
  return response.data; // { comment: {...} }
}

export async function deleteSubmissionComment(submissionId, commentId) {
  const response = await api.delete(`/submissions/${submissionId}/comments/${commentId}`);
  return response.data; // { ok: true }
}

