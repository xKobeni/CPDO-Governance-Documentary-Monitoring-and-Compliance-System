import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "../db/schema.sql");

async function ensureRoles() {
  await pool.query(
    `INSERT INTO roles (code, name)
     VALUES ('ADMIN', 'Administrator'), ('STAFF', 'Staff Member'), ('OFFICE', 'Office Head')
     ON CONFLICT (code) DO NOTHING`
  );
}

async function main() {
  const sql = fs.readFileSync(schemaPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("Schema applied from src/db/schema.sql");
    await ensureRoles();
    console.log("Default roles ensured");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
