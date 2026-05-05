import { randomInt } from "node:crypto";
import { z } from "zod";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { sha256 } from "../utils/tokenHash.js";
import { setCsrfCookie } from "../utils/csrf.js";
import { writeAuditLog } from "../models/audit.model.js";
import { sendMail } from "../services/maileroo.service.js";
import {
  buildPasswordResetEmail,
  buildVerificationSuccessWelcomeEmail,
} from "../services/email-templates.service.js";

import {
  findUserAuthByEmail,
  findUserById,
  updateUserProfile,
  updateUserPassword,
  updateLastLogin,
  recordFailedLoginAttempt,
  resetFailedLoginAttempts,
  setUserEmailVerified,
} from "../models/users.model.js";
import {
  findValidEmailVerificationToken,
  deleteEmailVerificationToken,
} from "../models/email-verification.model.js";
import { sendUserEmailVerification } from "../services/user-email-verification.service.js";
import {
  createSession,
  findValidSessionByHash,
  revokeSession,
  revokeAllSessionsByUserId,
} from "../models/sessions.model.js";
import {
  createPasswordResetToken,
  consumeValidResetTokenForEmail,
  revokeResetTokens,
} from "../models/password-reset.model.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateMeSchema = z.object({
  fullName: z.string().min(2).max(120),
});

async function safeWriteAuditLog(payload) {
  try {
    await writeAuditLog(payload);
  } catch {
    // Never break auth flow because of audit logging.
  }
}

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
    emailVerified: Boolean(user.email_verified),
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
  res.clearCookie("csrf_token", { path: "/" });
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const { email, password } = parsed.data;

  const user = await findUserAuthByEmail(email);
  const userAgent = req.headers["user-agent"] ?? null;
  const ipAddress = req.ip ?? null;

  // Account exists but is deactivated — tell the user explicitly
  if (user && !user.is_active) {
    await safeWriteAuditLog({
      actorUserId: user.id,
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: user.id,
      metadata: { email, reason: "account_deactivated", userAgent, ipAddress },
    });
    return res.status(403).json({
      message: "Your account has been deactivated. Please contact the administrator.",
      code: "ACCOUNT_DEACTIVATED",
    });
  }

  if (!user) {
    await safeWriteAuditLog({
      actorUserId: null,
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: null,
      metadata: { email, reason: "invalid_credentials", userAgent, ipAddress },
    });
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Check if account is locked
  if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
    const minutesRemaining = Math.ceil((new Date(user.account_locked_until) - new Date()) / 60000);
    await safeWriteAuditLog({
      actorUserId: user.id,
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: user.id,
      metadata: {
        email,
        reason: "account_locked",
        lockedUntil: user.account_locked_until,
        userAgent,
        ipAddress,
      },
    });
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
    
    await safeWriteAuditLog({
      actorUserId: user.id,
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: user.id,
      metadata: { email, reason: "wrong_password", attemptsRemaining, userAgent, ipAddress },
    });
    
    if (updated?.account_locked_until && new Date(updated.account_locked_until) > new Date()) {
      await safeWriteAuditLog({
        actorUserId: user.id,
        action: "ACCOUNT_LOCKED",
        entityType: "USER",
        entityId: user.id,
        metadata: { email, lockedUntil: updated.account_locked_until, userAgent, ipAddress },
      });
      
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

  if (!user.email_verified) {
    await safeWriteAuditLog({
      actorUserId: user.id,
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: user.id,
      metadata: { email, reason: "email_not_verified", userAgent, ipAddress },
    });
    return res.status(403).json({
      message: "Please verify your email before signing in. Check your inbox for the verification link.",
      code: "EMAIL_NOT_VERIFIED",
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
  setCsrfCookie(res, { secure: env.cookieSecure });
  await updateLastLogin(user.id);

  const accessToken = signAccessToken(accessPayload);

  const fullUser = await findUserById(user.id);
  await safeWriteAuditLog({
    actorUserId: user.id,
    action: "LOGIN_SUCCESS",
    entityType: "USER",
    entityId: user.id,
    metadata: {
      email: user.email,
      role: user.role_code,
      sessionId: session.id,
      userAgent,
      ipAddress,
    },
  });

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
  const newSession = await createSession({
    userId: payload.sub,
    refreshTokenHash: sha256(newRefreshToken),
    userAgent: req.headers["user-agent"] ?? null,
    ipAddress: req.ip ?? null,
    expiresAt,
  });

  setRefreshCookie(res, newRefreshToken);
  setCsrfCookie(res, { secure: env.cookieSecure });

  const accessToken = signAccessToken(accessPayload);
  return res.json({ accessToken, sessionId: newSession.id });
}

export async function logout(req, res) {
  const token = req.cookies?.refresh_token;
  if (token) {
    const session = await findValidSessionByHash(sha256(token));
    if (session?.id) {
      await revokeSession(session.id);
    } else {
      try {
        verifyRefreshToken(token);
      } catch {
        // Ignore invalid token on logout; clearing cookie is enough.
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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function forgotPassword(req, res) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid email" });

  const { email } = parsed.data;
  const user = await findUserAuthByEmail(email);

  // Always return success to avoid email enumeration
  const response = {
    message:
      "If an account exists with this email, we sent a 6-digit code. Use it on the reset page to choose a new password.",
  };

  if (!user || !user.is_active) {
    return res.json(response);
  }

  // Revoke any existing tokens for this user
  await revokeResetTokens(user.id);

  const resetCode = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await createPasswordResetToken(user.id, resetCode, expiresAt);

  const baseUrl = (env.frontendUrl || "").replace(/\/$/, "");
  const resetUrl = baseUrl
    ? `${baseUrl}/forgot-password?step=reset&email=${encodeURIComponent(user.email)}`
    : "";

  try {
    const emailContent = buildPasswordResetEmail({
      resetCode,
      expiresIn: "1 hour",
      resetUrl,
    });

    const emailResult = await sendMail({
      to: user.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    if (emailResult.skipped && env.nodeEnv !== "production") {
      response.resetToken = resetCode;
      response.message =
        "Email delivery is disabled in this environment. Use the 6-digit code below for local testing.";
    }
  } catch (e) {
    console.error("[auth] Failed to send password reset email", e?.message || e);
  }

  try {
    await writeAuditLog({
      actorUserId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "USER",
      entityId: user.id,
      metadata: { email },
    });
  } catch (e) {
    // Don't break flow
  }

  return res.json(response);
}

export async function resetPassword(req, res) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors?.[0]?.message || "Invalid input";
    return res.status(400).json({ message: msg });
  }

  const { email, token, newPassword } = parsed.data;
  const normalizedToken = token.replace(/\D/g, "");
  if (normalizedToken.length !== 6) {
    return res.status(400).json({ message: "Enter the 6-digit code from your email." });
  }

  const valid = await consumeValidResetTokenForEmail(email, normalizedToken);
  if (!valid) {
    return res.status(400).json({ message: "Invalid or expired reset code. Please request a new one." });
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await updateUserPassword(valid.user_id, passwordHash);
  if (!updated) {
    return res.status(500).json({ message: "Failed to update password" });
  }
  await revokeAllSessionsByUserId(valid.user_id);

  try {
    await writeAuditLog({
      actorUserId: valid.user_id,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "USER",
      entityId: valid.user_id,
      metadata: {},
    });
  } catch (e) {
    // Don't break flow
  }

  return res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
}

function frontendLoginPath(query) {
  const base = (env.frontendUrl || env.corsOrigin || "").replace(/\/$/, "");
  const path = "/login";
  if (!base) return `${path}${query}`;
  return `${base}${path}${query}`;
}

export async function verifyEmail(req, res) {
  const token = req.query?.token;
  if (!token || typeof token !== "string") {
    return res.redirect(302, frontendLoginPath("?verify=invalid"));
  }

  const valid = await findValidEmailVerificationToken(token);
  if (!valid) {
    return res.redirect(302, frontendLoginPath("?verify=invalid"));
  }

  const userId = valid.user_id;
  try {
    await setUserEmailVerified(userId, true);
    await deleteEmailVerificationToken(userId, token);
    const user = await findUserById(userId);

    if (user?.email) {
      const base = (env.frontendUrl || env.corsOrigin || "").replace(/\/$/, "");
      const loginUrl = base ? `${base}/login` : "";
      const welcomeEmail = buildVerificationSuccessWelcomeEmail({
        name: user.full_name || "Team Member",
        email: user.email,
        role: user.role_name || user.role_code || "",
        department: user.office_name || "",
        loginUrl,
      });

      try {
        await sendMail({
          to: user.email,
          subject: welcomeEmail.subject,
          text: welcomeEmail.text,
          html: welcomeEmail.html,
        });
      } catch (mailError) {
        console.error(
          "[auth] verifyEmail welcome email send failed",
          mailError?.message || mailError,
        );
      }
    }

    try {
      await writeAuditLog({
        actorUserId: userId,
        action: "EMAIL_VERIFIED",
        entityType: "USER",
        entityId: userId,
        metadata: {},
      });
    } catch (e) {
      /* ignore */
    }
  } catch (e) {
    console.error("[auth] verifyEmail failed", e?.message || e);
    return res.redirect(302, frontendLoginPath("?verify=error"));
  }

  return res.redirect(302, frontendLoginPath("?verified=1"));
}

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export async function resendVerification(req, res) {
  const parsed = resendVerificationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid email" });

  const { email } = parsed.data;
  const user = await findUserAuthByEmail(email);

  const response = {
    ok: true,
    message: "If this account is eligible, we sent a verification email.",
  };

  if (!user || !user.is_active || user.email_verified) {
    return res.json(response);
  }

  try {
    await sendUserEmailVerification(user.id, user.email);
    try {
      await writeAuditLog({
        actorUserId: user.id,
        action: "EMAIL_VERIFICATION_SENT",
        entityType: "USER",
        entityId: user.id,
        metadata: { email, source: "resend" },
      });
    } catch (e) {
      /* ignore */
    }
  } catch (e) {
    console.error("[auth] resendVerification send failed", e?.message || e);
  }

  return res.json(response);
}