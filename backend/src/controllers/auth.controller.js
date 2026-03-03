import { z } from "zod";
import { env } from "../config/env.js";
import { verifyPassword } from "../utils/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { setCsrfCookie } from "../utils/csrf.js";
import { sha256 } from "../utils/tokenHash.js";

import { findUserAuthByEmail, updateLastLogin } from "../models/users.model.js";
import { createSession, findValidSessionByHash, revokeSession } from "../models/sessions.model.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setRefreshCookie(res, token) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "strict",
    domain: env.cookieDomain,
    path: "/api/auth",
    maxAge: env.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res) {
  res.clearCookie("refresh_token", { path: "/api/auth" });
  res.clearCookie("csrf_token", { path: "/" });
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const { email, password } = parsed.data;

  const user = await findUserAuthByEmail(email);
  if (!user || !user.is_active) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await verifyPassword(user.password_hash, password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  // Access token payload
  const accessPayload = {
    sub: user.id,
    role: user.role_code,
    officeId: user.office_id ?? null,
  };

  // Create refresh session (store HASH only)
  const expiresAt = new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000);

  // create a refresh token AFTER we have a session id
  // Strategy: create session first with placeholder hash, then update by revoking+creating is overkill.
  // Better: create a temporary random sid now:
  const sid = cryptoRandomId();

  const refreshPayload = { ...accessPayload, sid };
  const refreshToken = signRefreshToken(refreshPayload);

  const session = await createSession({
    userId: user.id,
    refreshTokenHash: sha256(refreshToken),
    userAgent: req.headers["user-agent"] ?? null,
    ipAddress: req.ip ?? null,
    expiresAt,
  });

  // We used sid independent of DB id; that's fine. If you want DB session id as sid, tell me.
  setRefreshCookie(res, refreshToken);
  setCsrfCookie(res, { secure: env.cookieSecure });
  await updateLastLogin(user.id);

  const accessToken = signAccessToken(accessPayload);

  return res.json({
    accessToken,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role_code,
      officeId: user.office_id ?? null,
    },
  });
}

function cryptoRandomId() {
  // no extra dep
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export async function refresh(req, res) {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  // Verify JWT signature/exp
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  // Validate session by hash (revoked/expired)
  const session = await findValidSessionByHash(sha256(token));
  if (!session) {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Session invalid" });
  }

  // ROTATE: revoke old session and create a new one
  await revokeSession(session.id);

  const accessPayload = {
    sub: payload.sub,
    role: payload.role,
    officeId: payload.officeId ?? null,
  };

  const newSid = cryptoRandomId();
  const newRefreshPayload = { ...accessPayload, sid: newSid };
  const newRefreshToken = signRefreshToken(newRefreshPayload);

  const expiresAt = new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000);
  await createSession({
    userId: payload.sub,
    refreshTokenHash: sha256(newRefreshToken),
    userAgent: req.headers["user-agent"] ?? null,
    ipAddress: req.ip ?? null,
    expiresAt,
  });

  setRefreshCookie(res, newRefreshToken);

  const accessToken = signAccessToken(accessPayload);
  return res.json({ accessToken });
}

export async function logout(req, res) {
  const token = req.cookies?.refresh_token;
  if (token) {
    const session = await findValidSessionByHash(sha256(token));
    if (session) await revokeSession(session.id);
  }
  clearAuthCookies(res);
  return res.json({ ok: true });
}

export async function me(req, res) {
  return res.json({ user: req.user });
}