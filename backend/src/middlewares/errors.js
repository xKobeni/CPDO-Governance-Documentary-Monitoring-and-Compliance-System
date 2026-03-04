import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export function notFound(req, res) {
  return res.status(404).json({ message: "Not found" });
}

export function errorHandler(err, req, res, next) {
  // Log error for debugging
  if (err) {
    logger.error({
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    }, "Request error");
  }

  const status = err?.statusCode || err?.status || 500;

  if (env.nodeEnv !== "production") {
    return res.status(status).json({
      message: err?.message || "Internal server error",
      stack: err?.stack,
    });
  }

  // Production: don't leak stack traces
  return res.status(status).json({ message: "Internal server error" });
}