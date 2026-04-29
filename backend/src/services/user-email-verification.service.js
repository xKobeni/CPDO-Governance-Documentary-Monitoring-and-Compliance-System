import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import { sendMail } from "./maileroo.service.js";
import { buildEmailVerificationEmail } from "./email-templates.service.js";
import {
  createEmailVerificationToken,
  revokeEmailVerificationTokens,
} from "../models/email-verification.model.js";

const VERIFICATION_TTL_MS = 48 * 60 * 60 * 1000;

/**
 * Revoke old tokens, create a new one, and send the verification email.
 * @returns {Promise<{ sent: boolean, skipped?: boolean, rawToken?: string }>}
 */
export async function sendUserEmailVerification(userId, email) {
  await revokeEmailVerificationTokens(userId);
  const rawToken = nanoid(40);
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
  await createEmailVerificationToken(userId, rawToken, expiresAt);

  const apiOrigin = (env.publicApiUrl || `http://localhost:${env.port}`).replace(/\/$/, "");
  const verifyUrl = `${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;

  const emailContent = buildEmailVerificationEmail({
    verifyUrl,
    expiresIn: "48 hours",
  });

  const emailResult = await sendMail({
    to: email,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });

  if (emailResult.skipped && env.nodeEnv !== "production") {
    return { sent: false, skipped: true, rawToken };
  }

  return { sent: !emailResult.skipped };
}
