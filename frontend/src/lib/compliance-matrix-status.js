export const MATRIX_STATUSES = {
  APPROVED: "APPROVED",
  PENDING: "PENDING",
  DENIED: "DENIED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  IN_PROGRESS: "IN_PROGRESS",
  NOT_STARTED: "NOT_STARTED",
};

export function normalizeMatrixStatus(status) {
  const s = String(status || "").toUpperCase();
  if (Object.prototype.hasOwnProperty.call(MATRIX_STATUSES, s)) return s;
  if (s === "NOT_APPLICABLE") return MATRIX_STATUSES.NOT_STARTED;
  if (s === "NOT_SUBMITTED") return MATRIX_STATUSES.NOT_STARTED;
  return MATRIX_STATUSES.NOT_STARTED;
}
