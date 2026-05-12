import "dotenv/config";

/** @returns {boolean | undefined} undefined = infer from DATABASE_URL */
function parseDatabaseSsl(raw) {
  if (raw == null || String(raw).trim() === "") return undefined;
  const v = String(raw).trim().toLowerCase();
  if (["true", "1", "yes", "require"].includes(v)) return true;
  if (["false", "0", "no", "disable"].includes(v)) return false;
  return undefined;
}

function parseBoolean(raw, fallback = false) {
  if (raw == null || String(raw).trim() === "") return fallback;
  return String(raw).trim().toLowerCase() === "true";
}

function parseNumber(raw, fallback) {
  if (raw == null || String(raw).trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  /** Empty or invalid PORT must not become 0 (random bind); breaks Render port detection. */
  port: (() => {
    const p = parseNumber(process.env.PORT, 5000);
    return p > 0 ? p : 5000;
  })(),

  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: parseDatabaseSsl(process.env.DATABASE_SSL),

  corsOrigin: process.env.CORS_ORIGIN,

  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  inactivityTimeoutMinutes: Number(process.env.INACTIVITY_TIMEOUT_MINUTES ?? 30),
  uploadQuotaBytes: Number(process.env.UPLOAD_QUOTA_BYTES ?? 262144000),

  cookieSecure: parseBoolean(process.env.COOKIE_SECURE, false),
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  smtpHost: process.env.SMTP_HOST?.trim(),
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: parseBoolean(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER?.trim(),
  smtpPass: process.env.SMTP_PASS,
  mailFrom: process.env.MAIL_FROM?.trim(),
  mailRetryAttempts: parseNumber(process.env.MAIL_RETRY_ATTEMPTS, 3),
  mailRetryDelayMs: parseNumber(process.env.MAIL_RETRY_DELAY_MS, 1000),
  mailRetryBackoffMultiplier: parseNumber(process.env.MAIL_RETRY_BACKOFF_MULTIPLIER, 2),
  frontendUrl: process.env.FRONTEND_URL?.trim() || process.env.CORS_ORIGIN?.trim(),
  /** Origin where this API is reachable (for email links). E.g. https://api.example.com — no path. */
  publicApiUrl: process.env.PUBLIC_API_URL?.trim(),

  reminderWindowDays: parseNumber(process.env.REMINDER_WINDOW_DAYS, 7),

  b2KeyId: process.env.B2_KEY_ID?.trim(),
  b2ApplicationKey: process.env.B2_APPLICATION_KEY?.trim(),
  b2BucketName: process.env.B2_BUCKET_NAME?.trim(),
  b2Endpoint: process.env.B2_ENDPOINT?.trim()
};

const required = ["databaseUrl", "corsOrigin", "accessSecret", "refreshSecret"];
for (const k of required) {
  if (!env[k]) throw new Error(`Missing env var: ${k}`);
}