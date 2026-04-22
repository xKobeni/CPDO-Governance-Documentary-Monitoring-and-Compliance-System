import { env } from "../config/env.js";

export function buildPasswordResetEmail({ resetCode, expiresIn = "1 hour" }) {
  const appName = "CPDO Monitoring System";
  const loginUrl = `${(env.frontendUrl || "").replace(/\/$/, "")}/login`;

  const subject = `Password reset code for ${appName}`;
  const text = [
    `You requested a password reset for ${appName}.`,
    "",
    `Your reset code is: ${resetCode}`,
    `This code will expire in ${expiresIn}.`,
    "",
    "If you did not request this change, you can safely ignore this email.",
    "",
    loginUrl ? `Login: ${loginUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin: 0 0 12px;">Password reset request</h2>
      <p style="margin: 0 0 12px;">You requested a password reset for <strong>${appName}</strong>.</p>
      <p style="margin: 0 0 4px;">Your reset code is:</p>
      <p style="font-size: 24px; font-weight: 700; letter-spacing: 1px; margin: 0 0 12px;">${resetCode}</p>
      <p style="margin: 0 0 12px;">This code will expire in ${expiresIn}.</p>
      <p style="margin: 0 0 12px;">If you did not request this change, you can safely ignore this email.</p>
      ${loginUrl ? `<p style="margin: 0;">Login: <a href="${loginUrl}">${loginUrl}</a></p>` : ""}
    </div>
  `;

  return { subject, text, html };
}
