import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { pool, dbHealthcheck } from "./config/db.js";
import { logger } from "./config/logger.js";
import { verifyMailTransport } from "./services/maileroo.service.js";
import { startDeadlineReminderScheduler } from "./services/deadline-reminders.service.js";

const app = createApp();

async function ensureRoles() {
  await pool.query(
    `INSERT INTO roles (code, name)
     VALUES ('ADMIN', 'Administrator'), ('STAFF', 'Staff Member'), ('OFFICE', 'Office Head')
     ON CONFLICT (code) DO NOTHING`
  );
}

(async () => {
  try {
    const ok = await dbHealthcheck();
    if (!ok) throw new Error("DB healthcheck failed");

    await ensureRoles();
    try {
      const mailStatus = await verifyMailTransport();
      if (mailStatus.enabled) {
        logger.info("SMTP transport verified");
      } else {
        logger.warn("SMTP transport disabled. Emails will not be sent.");
      }
    } catch (mailErr) {
      logger.warn(
        {
          code: mailErr?.code,
          responseCode: mailErr?.responseCode,
          message: mailErr?.message,
        },
        "SMTP verification failed. Server will continue with email disabled.",
      );
    }

    startDeadlineReminderScheduler({ logger });

    app.listen(env.port, () => {
      logger.info({ port: env.port }, "API server running");
    });
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
})();