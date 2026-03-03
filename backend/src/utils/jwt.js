import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(payload) {
  return jwt.sign(payload, env.accessSecret, { expiresIn: env.accessTtl });
}

export function signRefreshToken(payload) {
  // payload should include: sub, sid, role, officeId
  return jwt.sign(payload, env.refreshSecret, { expiresIn: `${env.refreshTtlDays}d` });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.refreshSecret);
}