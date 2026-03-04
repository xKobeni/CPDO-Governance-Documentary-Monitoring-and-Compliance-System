import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import pinoHttp from "pino-http";
import compression from "compression";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middlewares/errors.js";

export function createApp() {
  const app = express();

  // Trust proxy if behind nginx/load balancer (needed for secure cookies)
  if (env.nodeEnv === "production") app.set("trust proxy", 1);

  app.use(helmet());
  
  // Compression middleware - gzip responses over 1kb
  app.use(compression({ threshold: 1024 }));

  app.use(cors({
    origin: env.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }));

  app.use(express.json({ limit: "1mb" })); // reduce abuse
  app.use(cookieParser());

  app.use(pinoHttp({ logger }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.use("/api", routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}