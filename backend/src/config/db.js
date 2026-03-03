import pg from "pg";
import { env } from "./env.js";

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  ssl: env.nodeEnv === "production" ? { rejectUnauthorized: false } : false,
});

export async function dbHealthcheck() {
  const res = await pool.query("SELECT 1 as ok");
  return res.rows?.[0]?.ok === 1;
}