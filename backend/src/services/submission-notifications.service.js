import { pool } from "../config/db.js";
import { createNotification, createNotificationsBulk } from "../models/notifications.model.js";

/**
 * Role-based routing for submission-related notifications.
 *
 * OFFICE (sends): new submission / uploads / comments → STAFF get actionable items;
 *                 ADMIN get short SYSTEM “oversight” lines (not duplicates of staff copy).
 * STAFF (sends):  comments / formal reviews → all active OFFICE users for that office;
 *                 internal audit: ADMIN notified on staff reviews, STAFF on admin reviews.
 * ADMIN (sends):  comments / reviews → same office fan-out; internal audit to STAFF on admin actions.
 */

async function fetchActiveStaffAndAdminIds() {
  const { rows } = await pool.query(
    `SELECT u.id, r.code AS role_code
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE r.code IN ('STAFF', 'ADMIN') AND u.is_active = TRUE`
  );
  const staffIds = [];
  const adminIds = [];
  for (const row of rows) {
    if (row.role_code === "STAFF") staffIds.push(row.id);
    else if (row.role_code === "ADMIN") adminIds.push(row.id);
  }
  return { staffIds, adminIds };
}

async function fetchActiveOfficeUserIdsForOffice(officeId) {
  if (!officeId) return [];
  const { rows } = await pool.query(
    `SELECT u.id
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE r.code = 'OFFICE' AND u.office_id = $1 AND u.is_active = TRUE`,
    [officeId]
  );
  return rows.map((r) => r.id);
}

async function fetchActiveAdminIdsExcluding(excludeUserId) {
  const { rows } = await pool.query(
    `SELECT u.id
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE r.code = 'ADMIN' AND u.is_active = TRUE AND u.id <> $1`,
    [excludeUserId]
  );
  return rows.map((r) => r.id);
}

async function fetchActiveStaffIdsExcluding(excludeUserId) {
  const { rows } = await pool.query(
    `SELECT u.id
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE r.code = 'STAFF' AND u.is_active = TRUE AND u.id <> $1`,
    [excludeUserId]
  );
  return rows.map((r) => r.id);
}

function dedupeIds(ids) {
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** OFFICE opened a submission record (before / without file) — queue staff, log for admin */
export async function notifyOfficeOpenedSubmission({
  submissionId,
  officeName,
  itemTitle,
  governanceCode,
}) {
  const { staffIds, adminIds } = await fetchActiveStaffAndAdminIds();
  const rows = [
    ...dedupeIds(staffIds).map((userId) => ({
      userId,
      type: "SUBMISSION_RECEIVED",
      title: `Ready for review — ${officeName}`,
      body: `${itemTitle} (${governanceCode}). The office opened a submission; confirm documents when uploaded.`,
      linkSubmissionId: submissionId,
    })),
    ...dedupeIds(adminIds).map((userId) => ({
      userId,
      type: "SYSTEM",
      title: `Oversight: submission opened — ${officeName}`,
      body: `${officeName} registered "${itemTitle}" (${governanceCode}). Staff were notified to review.`,
      linkSubmissionId: submissionId,
    })),
  ];
  if (rows.length) await createNotificationsBulk(rows);
}

/** OFFICE first-time file upload — staff actionable, admin oversight */
export async function notifyOfficeFirstFileUploaded({
  submissionId,
  officeName,
  itemTitle,
  fileName,
}) {
  const { staffIds, adminIds } = await fetchActiveStaffAndAdminIds();
  const rows = [
    ...dedupeIds(staffIds).map((userId) => ({
      userId,
      type: "SUBMISSION_RECEIVED",
      title: `New file to review — ${officeName}`,
      body: `${itemTitle}: ${fileName}`,
      linkSubmissionId: submissionId,
    })),
    ...dedupeIds(adminIds).map((userId) => ({
      userId,
      type: "SYSTEM",
      title: `Oversight: file received — ${officeName}`,
      body: `${itemTitle}: ${fileName} (staff notified for review).`,
      linkSubmissionId: submissionId,
    })),
  ];
  if (rows.length) await createNotificationsBulk(rows);
}

/** OFFICE replaced an existing file — staff must re-check; admin audit trail */
export async function notifyOfficeReplacedFile({
  submissionId,
  officeName,
  itemTitle,
  previousFileName,
  newFileName,
}) {
  const { staffIds, adminIds } = await fetchActiveStaffAndAdminIds();
  const staffBody = `${itemTitle}: "${previousFileName}" → "${newFileName}" — please re-check if needed.`;
  const adminBody = `${officeName} · ${itemTitle}: replaced "${previousFileName}" with "${newFileName}".`;
  const rows = [
    ...dedupeIds(staffIds).map((userId) => ({
      userId,
      type: "FILE_REPLACED",
      title: `File replaced — ${officeName}`,
      body: staffBody,
      linkSubmissionId: submissionId,
    })),
    ...dedupeIds(adminIds).map((userId) => ({
      userId,
      type: "FILE_REPLACED",
      title: `Audit: file replaced — ${officeName}`,
      body: adminBody,
      linkSubmissionId: submissionId,
    })),
  ];
  if (rows.length) await createNotificationsBulk(rows);
}

/** OFFICE user posted a discussion comment */
export async function notifyOfficeCommentToReviewers({
  submissionId,
  itemTitle,
  commentTitle,
  commentBody,
}) {
  const { staffIds, adminIds } = await fetchActiveStaffAndAdminIds();
  const rows = [
    ...dedupeIds(staffIds).map((userId) => ({
      userId,
      type: "NEW_COMMENT",
      title: commentTitle,
      body: commentBody,
      linkSubmissionId: submissionId,
    })),
    ...dedupeIds(adminIds).map((userId) => ({
      userId,
      type: "SYSTEM",
      title: `Office discussion — ${itemTitle}`,
      body: `An office user commented (see thread). Preview: ${commentBody.slice(0, 120)}${commentBody.length > 120 ? "…" : ""}`,
      linkSubmissionId: submissionId,
    })),
  ];
  if (rows.length) await createNotificationsBulk(rows);
}

/** STAFF or ADMIN posted a discussion comment — all office users for that submission's office */
export async function notifyStaffOrAdminCommentToOffice({
  submissionId,
  officeId,
  itemTitle,
  commentTitle,
  commentBody,
  authorUserId,
}) {
  const officeUserIds = dedupeIds(await fetchActiveOfficeUserIdsForOffice(officeId));
  const targets = officeUserIds.filter((id) => id !== authorUserId);
  const rows = targets.map((userId) => ({
    userId,
    type: "NEW_COMMENT",
    title: commentTitle,
    body: commentBody,
    linkSubmissionId: submissionId,
  }));
  if (rows.length) await createNotificationsBulk(rows);

  // Cross-role visibility: staff comment → admins get a light log; admin comment → staff get a light log
  if (authorUserId) {
    const { rows: roleRows } = await pool.query(
      `SELECT r.code FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
      [authorUserId]
    );
    const authorRole = String(roleRows[0]?.code || "").toUpperCase();
    const preview = commentBody.length > 200 ? `${commentBody.slice(0, 200)}…` : commentBody;
    if (authorRole === "STAFF") {
      const adminIds = dedupeIds(await fetchActiveAdminIdsExcluding(authorUserId));
      const internal = adminIds.map((userId) => ({
        userId,
        type: "SYSTEM",
        title: `Staff comment — ${itemTitle}`,
        body: preview,
        linkSubmissionId: submissionId,
      }));
      if (internal.length) await createNotificationsBulk(internal);
    } else if (authorRole === "ADMIN") {
      const staffIds = dedupeIds(await fetchActiveStaffIdsExcluding(authorUserId));
      const internal = staffIds.map((userId) => ({
        userId,
        type: "SYSTEM",
        title: `Admin comment — ${itemTitle}`,
        body: preview,
        linkSubmissionId: submissionId,
      }));
      if (internal.length) await createNotificationsBulk(internal);
    }
  }
}

/** Formal review decision: all office users get outcome; internal audit to the other role */
export async function notifyReviewDecision({
  submissionId,
  officeId,
  reviewerUserId,
  reviewerRole,
  notificationType,
  officeTitle,
  officeBody,
  officeName,
  itemTitle,
}) {
  const officeUserIds = dedupeIds(await fetchActiveOfficeUserIdsForOffice(officeId));
  const officeTargets = officeUserIds.filter((id) => id !== reviewerUserId);
  const officeRows = officeTargets.map((userId) => ({
    userId,
    type: notificationType,
    title: officeTitle,
    body: officeBody,
    linkSubmissionId: submissionId,
  }));
  if (officeRows.length) await createNotificationsBulk(officeRows);

  const role = String(reviewerRole || "").toUpperCase();
  if (role === "STAFF") {
    const adminIds = dedupeIds(await fetchActiveAdminIdsExcluding(reviewerUserId));
    const internal = adminIds.map((userId) => ({
      userId,
      type: "SYSTEM",
      title: `Staff decision — ${officeName}`,
      body: `${officeTitle}: ${itemTitle}`,
      linkSubmissionId: submissionId,
    }));
    if (internal.length) await createNotificationsBulk(internal);
  } else if (role === "ADMIN") {
    const staffIds = dedupeIds(await fetchActiveStaffIdsExcluding(reviewerUserId));
    const internal = staffIds.map((userId) => ({
      userId,
      type: "SYSTEM",
      title: `Admin decision — ${officeName}`,
      body: `${officeTitle}: ${itemTitle}`,
      linkSubmissionId: submissionId,
    }));
    if (internal.length) await createNotificationsBulk(internal);
  }
}
