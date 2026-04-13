import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../config/db.js";

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = jwt.verify(token, env.accessSecret);
    // expected: { sub, role, officeId }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid/expired token" });
  }
}

export async function checkSessionInactivity(req, res, next) {
  // Check if session has been inactive too long
  // Requires requireAuth to be called first
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sessionId = req.headers["x-session-id"];
  if (!sessionId) {
    // No session tracking - proceed
    return next();
  }

  try {
    const { rows } = await pool.query(
      `SELECT last_activity_at, revoked_at
       FROM auth_sessions
       WHERE id = $1 AND user_id = $2`,
      [sessionId, req.user.sub]
    );

    if (!rows[0] || rows[0].revoked_at) {
      return res.status(401).json({ message: "Session invalid" });
    }

    const lastActivity = new Date(rows[0].last_activity_at);
    const inactiveMinutes = (Date.now() - lastActivity.getTime()) / 1000 / 60;

    if (inactiveMinutes > env.inactivityTimeoutMinutes) {
      return res.status(401).json({ message: "Session inactive - please login again" });
    }

    // Update last activity asynchronously (don't block response)
    pool.query(
      `UPDATE auth_sessions SET last_activity_at = now() WHERE id = $1`,
      [sessionId]
    ).catch(() => {}); // Silently ignore errors

    next();
  } catch {
    return res.status(500).json({ message: "Session check failed" });
  }
}