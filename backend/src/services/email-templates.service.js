import { env } from "../config/env.js";

export function buildPasswordResetEmail({ resetCode, expiresIn = "1 hour", resetUrl = "" }) {
  const appName = "CPDO Monitoring System";
  const base = (env.frontendUrl || "").replace(/\/$/, "");
  const loginUrl = base ? `${base}/login` : "";

  const subject = `Password reset code for ${appName}`;
  const text = [
    `You requested a password reset for ${appName}.`,
    "",
    resetUrl ? `Open this link to enter your code and set a new password: ${resetUrl}` : "",
    "",
    `Your 6-digit reset code is: ${resetCode}`,
    `This code will expire in ${expiresIn}.`,
    "",
    "If you did not request this change, you can safely ignore this email.",
    "",
    loginUrl ? `Login: ${loginUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const ctaBlock = resetUrl
    ? `<p style="margin: 0 0 16px;">
        <a href="${resetUrl}" style="display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">Reset your password</a>
      </p>
      <p style="margin: 0 0 12px; font-size: 13px; color: #6b7280;">Or copy this link: <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a></p>`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin: 0 0 12px;">Password reset request</h2>
      <p style="margin: 0 0 12px;">You requested a password reset for <strong>${appName}</strong>.</p>
      ${ctaBlock}
      <p style="margin: 0 0 4px;">Your 6-digit reset code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 0 0 12px;">${resetCode}</p>
      <p style="margin: 0 0 12px;">This code will expire in ${expiresIn}.</p>
      <p style="margin: 0 0 12px;">If you did not request this change, you can safely ignore this email.</p>
      ${loginUrl ? `<p style="margin: 0;">Login: <a href="${loginUrl}">${loginUrl}</a></p>` : ""}
    </div>
  `;

  return { subject, text, html };
}
