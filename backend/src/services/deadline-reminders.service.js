import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import { createNotificationsBulk } from "../models/notifications.model.js";

const REMINDER_JOB_KEY = "deadline-reminders-job";

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateValue));
}

function formatDueInDays(dueDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(dueDate);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.max(0, Math.ceil((target.getTime() - start.getTime()) / msPerDay));

  if (diffDays === 0) return "due today";
  if (diffDays === 1) return "due tomorrow";
  return `due in ${diffDays} days`;
}

async function fetchActiveOfficeUsers(officeId) {
  const { rows } = await pool.query(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.code = 'OFFICE'
       AND u.office_id = $1
       AND u.is_active = TRUE`,
    [officeId]
  );

  return rows.map((row) => row.id);
}

async function hasReminderBeenSentToday(userId) {
  const { rows } = await pool.query(
    `SELECT 1
     FROM notifications
     WHERE user_id = $1
       AND type = 'DEADLINE_REMINDER'
       AND created_at::date = CURRENT_DATE
     LIMIT 1`,
    [userId]
  );

  return rows.length > 0;
}

async function fetchReminderCandidates() {
  const { rows } = await pool.query(
    `SELECT
       oga.office_id,
       o.name AS office_name,
       oga.year,
       ci.id AS checklist_item_id,
       ci.item_code,
       ci.title AS item_title,
       ci.due_date,
       ci.enable_reminder,
       ci.reminder_days_before,
       ga.code AS governance_code,
       ga.name AS governance_name,
       s.id AS submission_id,
       s.status AS submission_status
     FROM office_governance_assignments oga
     JOIN offices o
       ON o.id = oga.office_id
      AND o.is_active = TRUE
     JOIN governance_areas ga
       ON ga.id = oga.governance_area_id
      AND ga.is_active = TRUE
     JOIN checklist_templates ct
       ON ct.governance_area_id = ga.id
      AND ct.year = oga.year
      AND ct.status = 'ACTIVE'
     JOIN checklist_items ci
       ON ci.template_id = ct.id
      AND ci.is_active = TRUE
      AND ci.due_date IS NOT NULL
      AND ci.enable_reminder = TRUE
     LEFT JOIN submissions s
       ON s.office_id = oga.office_id
      AND s.checklist_item_id = ci.id
      AND s.year = oga.year
     WHERE ci.due_date <= CURRENT_DATE + (GREATEST(ci.reminder_days_before, 1)::int * INTERVAL '1 day')
       AND ci.due_date >= CURRENT_DATE
       AND (s.id IS NULL OR s.status IN ('DENIED', 'REVISION_REQUESTED'))
     ORDER BY o.name, ci.due_date, ga.sort_order, ci.sort_order, ci.item_code`,
    []
  );

  return rows;
}

function groupCandidatesByOffice(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = row.office_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        officeId: row.office_id,
        officeName: row.office_name,
        items: [],
      });
    }

    grouped.get(key).items.push(row);
  }

  return Array.from(grouped.values());
}

function buildReminderBody(officeName, items) {
  const visibleItems = items.slice(0, 3);
  const lines = visibleItems.map((item) => {
    const dueLabel = formatDueInDays(item.due_date);
    return `- ${item.governance_code} / ${item.item_code}: ${item.item_title} (${dueLabel}, ${formatDate(item.due_date)})`;
  });

  const remaining = items.length - visibleItems.length;
  if (remaining > 0) {
    lines.push(`- +${remaining} more item${remaining === 1 ? "" : "s"} requiring attention`);
  }

  return [
    `Submission deadline reminder for ${officeName}.`,
    `You have ${items.length} checklist item${items.length === 1 ? "" : "s"} due soon and still needing attention.`,
    "",
    ...lines,
    "",
    "Open Notifications to review the full list and take action before the deadline.",
  ].join("\n");
}

export async function runDeadlineReminderJob({ logger } = {}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: lockRows } = await client.query(
      `SELECT pg_try_advisory_lock(hashtext($1)) AS locked`,
      [REMINDER_JOB_KEY]
    );
    if (!lockRows[0]?.locked) {
      await client.query("ROLLBACK");
      return { sent: 0, skipped: true };
    }

    const candidates = await fetchReminderCandidates();
    const offices = groupCandidatesByOffice(candidates);
    let sent = 0;

    for (const office of offices) {
      const recipients = await fetchActiveOfficeUsers(office.officeId);
      if (recipients.length === 0) continue;

      const body = buildReminderBody(office.officeName, office.items);
      const notifications = [];
      for (const userId of recipients) {
        if (await hasReminderBeenSentToday(userId)) continue;
        notifications.push({
          userId,
          type: "DEADLINE_REMINDER",
          title: `Deadline reminder — ${office.officeName}`,
          body,
          linkSubmissionId: null,
        });
      }

      if (notifications.length > 0) {
        const created = await createNotificationsBulk(notifications);
        sent += created.length;
      }
    }

    await client.query("COMMIT");

    if (logger) {
      logger.info({ sent, officeCount: offices.length }, "Deadline reminder job completed");
    }

    return { sent, skipped: false };
  } catch (error) {
    await client.query("ROLLBACK");
    if (logger) {
      logger.error({ err: error }, "Deadline reminder job failed");
    }
    throw error;
  } finally {
    try {
      await client.query(
        `SELECT pg_advisory_unlock(hashtext($1))`,
        [REMINDER_JOB_KEY]
      );
    } catch {
      // best-effort unlock
    }
    client.release();
  }
}

export function startDeadlineReminderScheduler({ logger } = {}) {
  const intervalMs = 24 * 60 * 60 * 1000;

  void runDeadlineReminderJob({ logger }).catch(() => {
    // Errors are already logged inside the job.
  });

  const timer = setInterval(() => {
    void runDeadlineReminderJob({ logger }).catch(() => {
      // Errors are already logged inside the job.
    });
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  return timer;
}