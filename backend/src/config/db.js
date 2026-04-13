import pg from "pg";
import { env } from "./env.js";

function isLocalDbHost(hostname) {
  const h = (hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/** @returns {false | import("pg").PoolConfig["ssl"]} */
function poolSslOption() {
  if (env.databaseSsl === true) {
    return { rejectUnauthorized: false };
  }
  if (env.databaseSsl === false) {
    return false;
  }

  const urlStr = env.databaseUrl;
  if (!urlStr) return false;

  try {
    const u = new URL(urlStr);
    const mode = (u.searchParams.get("sslmode") || "").toLowerCase();
    if (mode && !["disable", "allow"].includes(mode)) {
      return { rejectUnauthorized: false };
    }
    if (!isLocalDbHost(u.hostname)) {
      return { rejectUnauthorized: false };
    }
  } catch {
    // invalid URL; fall through
  }

  return false;
}

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  ssl: poolSslOption(),
});

export async function dbHealthcheck() {
  const res = await pool.query("SELECT 1 as ok");
  return res.rows?.[0]?.ok === 1;
}