import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter;
let smtpWarningLogged = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryConfig() {
  const attempts = Math.max(1, Math.floor(env.mailRetryAttempts || 1));
  const delayMs = Math.max(0, Number(env.mailRetryDelayMs) || 0);
  const backoffMultiplier = Math.max(1, Number(env.mailRetryBackoffMultiplier) || 1);
  return { attempts, delayMs, backoffMultiplier };
}

function isRetryableError(error) {
  const code = error?.code ? String(error.code).toUpperCase() : "";
  const status = Number(error?.responseCode);

  if (status === 421 || status === 429 || status === 450 || status === 451 || status === 452) {
    return true;
  }

  return [
    "ECONNECTION",
    "ETIMEDOUT",
    "ESOCKET",
    "ECONNRESET",
    "ENOTFOUND",
    "EAI_AGAIN",
  ].includes(code);
}

function hasSmtpConfig() {
  return Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass && env.mailFrom);
}

function isSmtpEnabled() {
  return hasSmtpConfig();
}

function warnSmtpDisabled() {
  if (smtpWarningLogged) return;
  smtpWarningLogged = true;
  console.warn("[mail] SMTP is not configured. Outgoing email is disabled.");
}

function getTransporter() {
  if (!isSmtpEnabled()) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  return transporter;
}

export async function verifyMailTransport() {
  const client = getTransporter();
  if (!client) {
    if (env.nodeEnv !== "production") warnSmtpDisabled();
    return { enabled: false, verified: false };
  }

  await client.verify();
  return { enabled: true, verified: true };
}

export async function sendMail({ to, subject, text, html }) {
  const client = getTransporter();
  if (!client) {
    warnSmtpDisabled();
    return { sent: false, skipped: true };
  }

  const payload = {
    from: env.mailFrom,
    to,
    subject,
    text,
    html,
  };

  const { attempts, delayMs, backoffMultiplier } = getRetryConfig();
  let currentDelay = delayMs;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const info = await client.sendMail(payload);
      return { sent: true, skipped: false, messageId: info.messageId, attemptsUsed: attempt };
    } catch (error) {
      lastError = error;
      const canRetry = attempt < attempts && isRetryableError(error);
      if (!canRetry) break;

      console.warn(
        `[mail] Send failed (attempt ${attempt}/${attempts}). Retrying in ${currentDelay}ms. Reason: ${
          error?.code || error?.message || "unknown"
        }`,
      );
      await sleep(currentDelay);
      currentDelay = Math.ceil(currentDelay * backoffMultiplier);
    }
  }

  throw lastError;
}
