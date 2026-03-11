import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export function notFound(req, res) {
  return res.status(404).json({ message: "Not found" });
}

// PostgreSQL error codes
const PG_FK_VIOLATION      = '23503';
const PG_UNIQUE_VIOLATION  = '23505';
const PG_NOT_NULL_VIOLATION = '23502';

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

  // Translate known PostgreSQL errors to client-friendly responses
  if (err?.code === PG_FK_VIOLATION) {
    return res.status(422).json({
      message: "Invalid reference: a related record does not exist. The selected parent item may have been deleted.",
    });
  }
  if (err?.code === PG_UNIQUE_VIOLATION) {
    return res.status(409).json({ message: "A record with this value already exists." });
  }
  if (err?.code === PG_NOT_NULL_VIOLATION) {
    return res.status(400).json({ message: "A required field is missing." });
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