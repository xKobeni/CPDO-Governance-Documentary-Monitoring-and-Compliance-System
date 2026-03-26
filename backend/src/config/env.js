import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),

  databaseUrl: process.env.DATABASE_URL,

  corsOrigin: process.env.CORS_ORIGIN,

  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  inactivityTimeoutMinutes: Number(process.env.INACTIVITY_TIMEOUT_MINUTES ?? 30),
  uploadQuotaBytes: Number(process.env.UPLOAD_QUOTA_BYTES ?? 262144000),

  cookieSecure: String(process.env.COOKIE_SECURE ?? "false") === "true",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  b2KeyId: process.env.B2_KEY_ID?.trim(),
  b2ApplicationKey: process.env.B2_APPLICATION_KEY?.trim(),
  b2BucketName: process.env.B2_BUCKET_NAME?.trim(),
  b2Endpoint: process.env.B2_ENDPOINT?.trim()
};

const required = ["databaseUrl", "corsOrigin", "accessSecret", "refreshSecret"];
for (const k of required) {
  if (!env[k]) throw new Error(`Missing env var: ${k}`);
}