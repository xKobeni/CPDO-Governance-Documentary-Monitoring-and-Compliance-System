import { env } from "../config/env.js";

export function buildPasswordResetEmail({
  resetCode,
  expiresIn = "1 hour",
  resetUrl = "",
  name = "Team Member",
  appName = "SGLG Monitoring System",
  supportEmail = "cpdc.systems@gmail.com",
  websiteUrl = "https://inventrack.gov.ph",
  privacyUrl = "https://inventrack.gov.ph/privacy",
  termsUrl = "https://inventrack.gov.ph/terms",
  currentYear = new Date().getFullYear(),
}) {
  const base = (env.frontendUrl || "").replace(/\/$/, "");
  const loginUrl = base ? `${base}/login` : "";
  const subject = `Reset your password - ${appName}`;
  const text = [
    `Dear ${name},`,
    "",
    `We received a request to reset your password for ${appName}.`,
    "",
    resetUrl ? `Reset your password here: ${resetUrl}` : "",
    "",
    resetCode ? `Your 6-digit reset code is: ${resetCode}` : "",
    `This reset link/code will expire in ${expiresIn}.`,
    "",
    "If you did not request this change, you can safely ignore this email.",
    "",
    loginUrl ? `Login: ${loginUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Forgot Password - ${appName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:'Segoe UI', sans-serif;">
  <center>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:20px 10px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <tr>
              <td style="background-color:#991b1b; text-align:center; padding:30px 20px;">
                <h1 style="color:#ffffff; font-size:24px; margin:16px 0 8px;">Password Reset Request</h1>
                <p style="color:#fecaca; margin:0;">Secure your account access</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 20px 20px; color:#333333;">
                <p style="margin-top:0;">Dear ${name},</p>
                <p>We received a request to reset your password for your ${appName} account.</p>
                <p>Click the button below to continue resetting your password:</p>
                ${
                  resetUrl
                    ? `<div style="text-align:center; margin:30px 0;">
                  <a href="${resetUrl}" style="background-color:#dc2626; color:#ffffff; padding:14px 28px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-block;">Reset My Password</a>
                </div>
                <p style="color:#666666; font-size:14px;">If the button above does not work, copy and paste this link into your browser:</p>
                <p style="word-break:break-word; font-size:14px;"><a href="${resetUrl}" style="color:#dc2626;">${resetUrl}</a></p>`
                    : ""
                }
                ${
                  resetCode
                    ? `<div style="background-color:#f8f9fa; border:2px solid #e9ecef; border-radius:8px; padding:20px; margin:20px 0;">
                  <p style="margin:0 0 8px; color:#555555; font-size:14px; font-weight:bold;">Your 6-digit reset code:</p>
                  <p style="margin:0; font-size:28px; font-weight:700; letter-spacing:4px; color:#991b1b;">${resetCode}</p>
                </div>`
                    : ""
                }
                <div style="background-color:#fff3cd; border:1px solid #ffeaa7; border-radius:6px; padding:15px; margin:20px 0;">
                  <p style="margin:0; color:#856404; font-size:14px;"><strong>Important:</strong> This reset link/code will expire in ${expiresIn}. If you did not request a password reset, you can ignore this email and your password will remain unchanged.</p>
                </div>
                <p>If you need help, please contact:</p>
                <ul style="color:#555555; padding-left:20px;">
                  <li>Your CPDO administrator</li>
                  ${supportEmail ? `<li>Email: <a href="mailto:${supportEmail}" style="color:#dc2626;">${supportEmail}</a></li>` : ""}
                </ul>
                ${loginUrl ? `<p style="font-size:14px; color:#666666;">You can also go back to login here: <a href="${loginUrl}" style="color:#dc2626;">${loginUrl}</a></p>` : ""}
                <p>Best regards,<br>The ${appName} Team</p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f0f2f5; text-align:center; padding:20px; font-size:12px; color:#777777;">
                <p style="margin:0 0 10px 0;">&copy; ${currentYear} ${appName}. All rights reserved.</p>
                <p style="margin:0;">
                  <a href="${websiteUrl}" style="color:#dc2626; text-decoration:none; margin:0 10px;">Website</a> |
                  <a href="${privacyUrl}" style="color:#dc2626; text-decoration:none; margin:0 10px;">Privacy Policy</a> |
                  <a href="${termsUrl}" style="color:#dc2626; text-decoration:none; margin:0 10px;">Terms of Service</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;

  return { subject, text, html };
}

export function buildEmailVerificationEmail({
  verifyUrl,
  expiresIn = "24 hours",
  name = "Team Member",
  appName = "SGLG Monitoring System",
  supportEmail = "cpdc.systems@gmail.com",
  websiteUrl = "https://inventrack.gov.ph",
  privacyUrl = "https://inventrack.gov.ph/privacy",
  termsUrl = "https://inventrack.gov.ph/terms",
  currentYear = new Date().getFullYear(),
}) {
  const subject = `Welcome to ${appName} - Verify your account`;
  const text = [
    `Dear ${name},`,
    "",
    `Welcome to ${appName}. Your account has been successfully created.`,
    "",
    "To complete registration, verify your email address:",
    "",
    verifyUrl ? `Verify here: ${verifyUrl}` : "",
    "",
    `This link will expire in ${expiresIn}.`,
    "",
    "If you did not request this account, please contact your administrator.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Welcome to ${appName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:'Segoe UI', sans-serif;">
  <center>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:20px 10px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <tr>
              <td style="background-color:#991b1b; text-align:center; padding:30px 20px;">
                <h1 style="color:#ffffff; font-size:24px; margin:16px 0 8px;">Welcome to ${appName}</h1>
                <p style="color:#fecaca; margin:0;">Official account verification email</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 20px 20px; color:#333333;">
                <p style="margin-top:0;">Dear ${name},</p>
                <p>Welcome to ${appName}. Your account has been successfully created.</p>
                <p>To ensure the security of your account and complete the registration process, please verify your email address by clicking the button below:</p>
                ${
                  verifyUrl
                    ? `<div style="text-align:center; margin:30px 0;">
                  <a href="${verifyUrl}" style="background-color:#dc2626; color:#ffffff; padding:14px 28px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-block;">Verify My Email</a>
                </div>
                <p style="color:#666666; font-size:14px;">If the button above does not work, you can copy and paste this link into your browser:</p>
                <p style="word-break:break-word; font-size:14px;"><a href="${verifyUrl}" style="color:#dc2626;">${verifyUrl}</a></p>`
                    : ""
                }
                <div style="background-color:#f8f9fa; padding:15px; border-radius:6px; margin:20px 0;">
                  <p style="margin:0; color:#555555; font-size:14px;"><strong>Important:</strong> This verification link will expire in ${expiresIn}. If you need a new verification link, please contact your system administrator.</p>
                </div>
                <p>If you did not request this account or need assistance, please contact:</p>
                <ul style="color:#555555; padding-left:20px;">
                  <li>Your CPDO administrator</li>
                  ${supportEmail ? `<li>Email: <a href="mailto:${supportEmail}" style="color:#dc2626;">${supportEmail}</a></li>` : ""}
                </ul>
                <p>Best regards,<br>The ${appName} Team</p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f0f2f5; text-align:center; padding:20px; font-size:12px; color:#777777;">
                <p style="margin:0 0 10px 0;">&copy; ${currentYear} ${appName}. All rights reserved.</p>
                <p style="margin:0;">
                  <a href="${websiteUrl}" style="color:#dc2626; text-decoration:none; margin:0 10px;">Website</a> |
                  <a href="${privacyUrl}" style="color:#dc2626; text-decoration:none; margin:0 10px;">Privacy Policy</a> |
                  <a href="${termsUrl}" style="color:#dc2626; text-decoration:none; margin:0 10px;">Terms of Service</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;

  return { subject, text, html };
}

export function buildVerificationSuccessWelcomeEmail({
  name = "Team Member",
  email = "",
  temporaryPassword = "",
  context = "verified",
  role = "",
  department = "",
  loginUrl = "",
  logoUrl = "",
  company = {},
  currentYear = new Date().getFullYear(),
}) {
  const appName = "SGLG Monitoring System";
  const companyName = company.name || "SGLG Monitoring System";
  const companyEmail = company.email || "cpdc.systems@gmail.com";
  const companyWebsite = company.website || "";
  const isCreatedContext = context === "created";
  const subject = isCreatedContext
    ? `Account created - ${appName} login details`
    : `Account successfully verified - ${appName} login details`;
  const headerTitle = isCreatedContext ? "Account Created" : "Account Successfully Verified";
  const introText = isCreatedContext
    ? `Your ${appName} account has been created successfully.`
    : `Congratulations! Your email address has been successfully verified and your ${appName} account is now active.`;

  const passwordLine = temporaryPassword
    ? `Temporary Password: ${temporaryPassword}`
    : "Temporary Password: Use the password given by your administrator.";

  const text = [
    `Dear ${name},`,
    "",
    introText,
    "",
    "Your login details:",
    `Email Address: ${email || "-"}`,
    passwordLine,
    `Position/Role: ${role || "-"}`,
    `Department: ${department || "-"}`,
    "",
    loginUrl ? `Login here: ${loginUrl}` : "",
    "",
    "Security Notice: Please change your temporary password immediately after your first login.",
    "",
    companyEmail ? `Support Email: ${companyEmail}` : "",
    companyWebsite ? `Website: ${companyWebsite}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const passwordValue = temporaryPassword || "Use the password given by your administrator.";
  const supportWebsite = companyWebsite || "#";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${headerTitle} - Your Login Credentials</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:'Segoe UI', sans-serif;">
  <center>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:20px 10px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <tr>
              <td style="background-color:#991b1b; text-align:center; padding:30px 20px;">
                <h1 style="color:#ffffff; font-size:24px; margin:16px 0 8px;">${headerTitle}</h1>
                <p style="color:#fecaca; margin:0;">Your login credentials are ready</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 20px 20px; color:#333333;">
                <p style="margin-top:0;">Dear ${name},</p>
                <p>${introText}</p>
                <p>Below are your login credentials to access the system:</p>

                <div style="background-color:#f8f9fa; border:2px solid #e9ecef; border-radius:8px; padding:20px; margin:20px 0;">
                  <h3 style="color:#003366; margin-top:0; margin-bottom:15px; font-size:18px;">Your Login Credentials</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:15px;">
                    <tr>
                      <td style="padding:8px 0; font-weight:bold; color:#555555; width:30%;">Email Address:</td>
                      <td style="padding:8px 0; color:#333333; font-family:monospace; font-size:14px;">${email || "-"}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0; font-weight:bold; color:#555555;">Temporary Password:</td>
                      <td style="padding:8px 0; color:#333333; font-family:monospace; font-size:14px; background-color:#fff3cd; border-radius:4px; border:1px solid #ffeaa7; padding-left:8px; padding-right:8px;">${passwordValue}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0; font-weight:bold; color:#555555;">Position/Role:</td>
                      <td style="padding:8px 0; color:#333333; font-size:14px;">${role || "-"}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0; font-weight:bold; color:#555555;">Department:</td>
                      <td style="padding:8px 0; color:#333333; font-size:14px;">${department || "-"}</td>
                    </tr>
                  </table>
                </div>

                ${
                  loginUrl
                    ? `<div style="text-align:center; margin:30px 0;">
                  <a href="${loginUrl}" style="background-color:#dc2626; color:#ffffff; padding:14px 28px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-block; font-size:16px;">Login to ${appName}</a>
                </div>`
                    : ""
                }

                <div style="background-color:#d4edda; border:1px solid #c3e6cb; border-radius:6px; padding:15px; margin:20px 0;">
                  <p style="margin:0; color:#155724; font-size:14px;">
                    <strong>Security Notice:</strong> For your security, please change your temporary password immediately after your first login.
                  </p>
                </div>

                <p style="color:#666666; font-size:14px;">If you have any questions or need assistance, please contact your system administrator.</p>
                ${
                  companyEmail || companyWebsite
                    ? `<ul style="color:#555555; padding-left:20px; font-size:14px;">
                  ${companyEmail ? `<li>Email: <a href="mailto:${companyEmail}" style="color:#dc2626;">${companyEmail}</a></li>` : ""}
                  ${companyWebsite ? `<li>Website: <a href="${companyWebsite}" style="color:#dc2626;">${companyWebsite}</a></li>` : ""}
                </ul>`
                    : ""
                }

                <p style="margin-top:30px;">Welcome to the team!<br><strong>${appName} Team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f0f2f5; text-align:center; padding:20px; font-size:12px; color:#777777;">
                <p style="margin:0 0 10px 0;">&copy; ${currentYear} ${companyName}. All rights reserved.</p>
                <p style="margin:0;">
                  <a href="${supportWebsite}" style="color:#dc2626; text-decoration:none; margin:0 10px;">Website</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;

  return { subject, text, html };
}
