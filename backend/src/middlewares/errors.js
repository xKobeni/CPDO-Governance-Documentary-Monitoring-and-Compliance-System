import { env } from "../config/env.js";

export function notFound(req, res) {
  return res.status(404).json({ message: "Not found" });
}

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;

  if (env.nodeEnv !== "production") {
    return res.status(status).json({
      message: err.message,
      stack: err.stack
    });
  }

  return res.status(status).json({ message: "Internal server error" });
}