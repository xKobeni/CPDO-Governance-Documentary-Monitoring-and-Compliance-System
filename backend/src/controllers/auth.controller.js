import { z } from "zod";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import { verifyPassword } from "../utils/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { sha256 } from "../utils/tokenHash.js";
import { writeAuditLog } from "../models/audit.model.js";

import {
  findUserAuthByEmail,
  findUserById,
  updateUserProfile,
  updateLastLogin,
  recordFailedLoginAttempt,
  resetFailedLoginAttempts,
} from "../models/users.model.js";
import { createSession, findValidSessionByHash, revokeSession, revokeAllSessionsByUserId } from "../models/sessions.model.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateMeSchema = z.object({
  fullName: z.string().min(2).max(120),
});

function formatUserProfile(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role_code,
    roleName: user.role_name,
    officeId: user.office_id ?? null,
    officeName: user.office_name ?? null,
    officeCode: user.office_code ?? null,
    isActive: user.is_active,
    createdAt: user.created_at ?? null,
    lastLoginAt: user.last_login_at ?? null,
  };
}

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
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const { email, password } = parsed.data;

  const user = await findUserAuthByEmail(email);
  if (!user || !user.is_active) {
    // Manual audit logging for failed login (invalid user/inactive)
    try {
      await writeAuditLog({
        actorUserId: user?.id || null,
        action: "LOGIN_FAILED",
        entityType: "USER",
        entityId: user?.id || null,
        metadata: { email, reason: "invalid_credentials" }
      });
    } catch (e) {
      // Don't break login flow for audit logging errors
    }
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Check if account is locked
  if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
    const minutesRemaining = Math.ceil((new Date(user.account_locked_until) - new Date()) / 60000);
    return res.status(423).json({
      message: `Account is locked. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`,
      lockedUntil: user.account_locked_until,
      attemptsRemaining: 0
    });
  }

  // Verify password
  const ok = await verifyPassword(user.password_hash, password);
  if (!ok) {
    // Record failed attempt
    const updated = await recordFailedLoginAttempt(user.id);
    const attemptsRemaining = Math.max(0, 5 - (updated?.failed_login_attempts || 0));
    
    // Manual audit logging for failed password
    try {
      await writeAuditLog({
        actorUserId: user.id,
        action: "LOGIN_FAILED",
        entityType: "USER",
        entityId: user.id,
        metadata: { email, reason: "wrong_password", attemptsRemaining: attemptsRemaining }
      });
    } catch (e) {
      // Don't break login flow for audit logging errors
    }
    
    if (updated?.account_locked_until && new Date(updated.account_locked_until) > new Date()) {
      // Manual audit logging for account lockout
      try {
        await writeAuditLog({
          actorUserId: user.id,
          action: "ACCOUNT_LOCKED",
          entityType: "USER",
          entityId: user.id,
          metadata: { email, lockedUntil: updated.account_locked_until }
        });
      } catch (e) {
        // Don't break login flow for audit logging errors
      }
      
      return res.status(423).json({
        message: "Account locked due to too many failed login attempts. Try again in 15 minutes.",
        lockedUntil: updated.account_locked_until,
        attemptsRemaining: 0
      });
    }

    return res.status(401).json({
      message: "Invalid credentials",
      attemptsRemaining,
      failedAttempts: updated?.failed_login_attempts || 0
    });
  }

  // Reset failed login attempts on successful login
  await resetFailedLoginAttempts(user.id);

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
  await updateLastLogin(user.id);

  const accessToken = signAccessToken(accessPayload);

  const fullUser = await findUserById(user.id);

  return res.json({
    accessToken,
    sessionId: session.id,
    user: formatUserProfile(fullUser ?? user),
  });
}

function cryptoRandomId() {
  // Use nanoid for cryptographically secure random ID generation
  return nanoid(32);
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
    if (session?.user_id) {
      await revokeAllSessionsByUserId(session.user_id);
    } else {
      try {
        const payload = verifyRefreshToken(token);
        if (payload?.sub) {
          await revokeAllSessionsByUserId(payload.sub);
        }
      } catch {
        if (session?.id) {
          await revokeSession(session.id);
        }
      }
    }
  }
  clearAuthCookies(res);
  return res.json({ ok: true });
}

export async function me(req, res) {
  const user = await findUserById(req.user.sub);
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json({ user: formatUserProfile(user) });
}

export async function updateMe(req, res) {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const updated = await updateUserProfile(req.user.sub, parsed.data);
  if (!updated) return res.status(404).json({ message: "User not found" });

  return res.json({ user: formatUserProfile(updated) });
}