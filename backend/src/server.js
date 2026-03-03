import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { dbHealthcheck } from "./config/db.js";
import { logger } from "./config/logger.js";

const app = createApp();

(async () => {
  const ok = await dbHealthcheck();
  if (!ok) throw new Error("DB healthcheck failed");

  app.listen(env.port, () => {
    logger.info({ port: env.port }, "API server running");
  });
})();