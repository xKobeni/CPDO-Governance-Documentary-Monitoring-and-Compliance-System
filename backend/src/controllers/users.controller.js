import { z } from "zod";
import { env } from "../config/env.js";
import { hashPassword } from "../utils/password.js";
import { getRoleByCode } from "../models/roles.model.js";
import {
  createUser,
  listUsers,
  setUserActive,
  findUserById,
  updateUser,
  deleteUser,
  updateUserPassword,
} from "../models/users.model.js";
import { revokeEmailVerificationTokens } from "../models/email-verification.model.js";
import { revokeAllSessionsByUserId } from "../models/sessions.model.js";
import { sendUserEmailVerification } from "../services/user-email-verification.service.js";
import { sendMail } from "../services/maileroo.service.js";
import { buildVerificationSuccessWelcomeEmail } from "../services/email-templates.service.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";
import { writeAuditLog } from "../models/audit.model.js";

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = pwd.length; i < 12; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pwd.sort(() => Math.random() - 0.5).join("");
}

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  fullName: z.string().min(2),
  roleCode: z.enum(["ADMIN", "STAFF", "OFFICE"]),
  officeId: z.string().uuid().nullable().optional(),
});

export async function createUserHandler(req, res) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });

  const { email, fullName, roleCode, officeId } = parsed.data;
  const rawPassword = parsed.data.password || generatePassword();

  if (roleCode === "OFFICE" && !officeId) {
    return res.status(400).json({ message: "OFFICE users must have officeId" });
  }

  const role = await getRoleByCode(roleCode);
  if (!role) return res.status(400).json({ message: "Role not found" });

  const passwordHash = await hashPassword(rawPassword);

  const user = await createUser({
    email,
    passwordHash,
    fullName,
    roleId: role.id,
    officeId: roleCode === "OFFICE" ? officeId : (officeId ?? null),
  });

  const payload = {
    user,
    generatedPassword: !parsed.data.password ? rawPassword : undefined,
  };

  try {
    const sendResult = await sendUserEmailVerification(user.id, user.email);
    if (sendResult.skipped && process.env.NODE_ENV !== "production") {
      payload.verificationDevToken = sendResult.rawToken;
    }
  } catch (e) {
    console.error("[users] Failed to send verification email", e?.message || e);
    payload.verificationEmailWarning = "Verification email could not be sent. Use resend from user management or ask the user to use Resend on the login page.";
  }

  try {
    const base = (env.frontendUrl || env.corsOrigin || "").replace(/\/$/, "");
    const loginUrl = base ? `${base}/login` : "";
    const credentialEmail = buildVerificationSuccessWelcomeEmail({
      name: fullName || "Team Member",
      email: user.email,
      temporaryPassword: rawPassword,
      context: "created",
      role: roleCode || "",
      department: "",
      loginUrl,
    });

    const credentialSend = await sendMail({
      to: user.email,
      subject: credentialEmail.subject,
      text: credentialEmail.text,
      html: credentialEmail.html,
    });

    if (credentialSend?.skipped) {
      payload.credentialEmailWarning =
        "Credential email was not sent because SMTP is not configured in this environment.";
    }
  } catch (e) {
    console.error("[users] Failed to send credential email", e?.message || e);
    payload.credentialEmailWarning =
      "User was created, but sending the credential email failed. Share the temporary password manually.";
  }

  return res.status(201).json(payload);
}

export async function listUsersHandler(req, res) {
  const { limit, offset, page } = getPaginationParams(req, 20, 100);
  const { rows, total } = await listUsers(limit, offset);
  return res.json(formatPaginatedResponse(rows, total, page, limit));
}

export async function setUserActiveHandler(req, res) {
  const id = req.params.id;
  const parsed = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const updated = await setUserActive(id, parsed.data.isActive);
  if (!updated) return res.status(404).json({ message: "User not found" });

  return res.json({ user: updated });
}

export async function getUserHandler(req, res) {
  const user = await findUserById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json({ user });
}

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(2).optional(),
  roleCode: z.enum(["ADMIN", "STAFF", "OFFICE"]).optional(),
  officeId: z.string().uuid().nullable().optional(),
});

export async function updateUserHandler(req, res) {
  const userId = req.params.id;
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });

  const { email, fullName, roleCode, officeId } = parsed.data;

  const existing = await findUserById(userId);
  if (!existing) return res.status(404).json({ message: "User not found" });

  const emailChanged =
    Boolean(email) && String(email).toLowerCase() !== String(existing.email).toLowerCase();

  if (emailChanged) {
    await revokeEmailVerificationTokens(userId);
  }

  let roleId = undefined;
  if (roleCode) {
    const role = await getRoleByCode(roleCode);
    if (!role) return res.status(400).json({ message: "Role not found" });
    roleId = role.id;
  }

  if (roleCode === "OFFICE" && !officeId) {
    return res.status(400).json({ message: "OFFICE users must have officeId" });
  }

  const updated = await updateUser(userId, {
    email,
    fullName,
    roleId,
    officeId: roleCode === "OFFICE" ? officeId : (officeId ?? undefined),
  });

  if (!updated) return res.status(404).json({ message: "User not found" });

  if (emailChanged) {
    try {
      await sendUserEmailVerification(userId, updated.email);
    } catch (e) {
      console.error("[users] Failed to send verification after email change", e?.message || e);
    }
  }

  return res.json({ user: updated });
}

export async function deleteUserHandler(req, res) {
  const userId = req.params.id;
  const user = await findUserById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.is_active) {
    return res.status(400).json({
      message: "Only inactive users can be deleted. Deactivate this user first.",
    });
  }

  const deleted = await deleteUser(userId);

  if (!deleted) return res.status(404).json({ message: "User not found" });
  return res.json({ message: "User deleted successfully" });
}

export async function resendUserVerificationHandler(req, res) {
  const userId = req.params.id;
  const user = await findUserById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!user.is_active) {
    return res.status(400).json({ message: "Cannot send verification to an inactive account." });
  }
  if (user.email_verified) {
    return res.status(400).json({ message: "This user's email is already verified." });
  }

  try {
    await sendUserEmailVerification(userId, user.email);
    try {
      await writeAuditLog({
        actorUserId: req.user?.sub ?? null,
        action: "EMAIL_VERIFICATION_SENT",
        entityType: "USER",
        entityId: userId,
        metadata: { email: user.email, source: "admin_resend" },
      });
    } catch (e) {
      /* ignore */
    }
  } catch (e) {
    console.error("[users] Admin resend verification failed", e?.message || e);
    return res.status(500).json({ message: "Failed to send verification email." });
  }

  return res.json({ ok: true, message: "Verification email sent." });
}

export async function resetUserPasswordHandler(req, res) {
  const userId = req.params.id;
  const user = await findUserById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const rawPassword = generatePassword();
  const passwordHash = await hashPassword(rawPassword);

  const updated = await updateUserPassword(userId, passwordHash);
  if (!updated) {
    return res.status(500).json({ message: "Failed to reset password" });
  }
  await revokeAllSessionsByUserId(userId);

  let credentialEmailSent = false;
  let credentialEmailWarning;

  try {
    const base = (env.frontendUrl || env.corsOrigin || "").replace(/\/$/, "");
    const loginUrl = base ? `${base}/login` : "";
    const credentialEmail = buildVerificationSuccessWelcomeEmail({
      name: user.full_name || "Team Member",
      email: user.email,
      temporaryPassword: rawPassword,
      role: user.role_name || user.role_code || "",
      department: user.office_name || "",
      loginUrl,
    });

    const sendResult = await sendMail({
      to: user.email,
      subject: credentialEmail.subject,
      text: credentialEmail.text,
      html: credentialEmail.html,
    });

    credentialEmailSent = Boolean(sendResult?.sent);
    if (sendResult?.skipped) {
      credentialEmailWarning =
        "Credential email was not sent because SMTP is not configured in this environment.";
    }
  } catch (e) {
    console.error("[users] Failed to send reset credential email", e?.message || e);
    credentialEmailWarning =
      "Password was reset, but sending credential email failed. Please share the password manually.";
  }

  return res.json({
    generatedPassword: rawPassword,
    credentialEmailSent,
    ...(credentialEmailWarning ? { credentialEmailWarning } : {}),
  });
}