import { pool } from "../config/db.js";

export async function listFiles(submissionId) {
  const { rows } = await pool.query(
    `SELECT id, version_no, file_name, mime_type, file_size_bytes, storage_key, sha256,
            uploaded_by, uploaded_at, is_current
     FROM submission_files
     WHERE submission_id = $1
     ORDER BY version_no DESC`,
    [submissionId]
  );
  return rows;
}

/**
 * Adds a new file version and makes it current (transaction-safe).
 */
export async function addNewFileVersion(payload) {
  const {
    submissionId, fileName, mimeType, fileSizeBytes, storageKey, sha256, uploadedBy
  } = payload;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const v = await client.query(
      `SELECT COALESCE(MAX(version_no), 0) as max_version
       FROM submission_files
       WHERE submission_id = $1
       FOR UPDATE`,
      [submissionId]
    );
    const nextVersion = Number(v.rows[0].max_version) + 1;

    // set previous current to false
    await client.query(
      `UPDATE submission_files
       SET is_current = FALSE
       WHERE submission_id = $1 AND is_current = TRUE`,
      [submissionId]
    );

    const ins = await client.query(
      `INSERT INTO submission_files
        (submission_id, version_no, file_name, mime_type, file_size_bytes, storage_key, sha256, uploaded_by, is_current)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)
       RETURNING *`,
      [submissionId, nextVersion, fileName, mimeType, fileSizeBytes, storageKey, sha256 ?? null, uploadedBy]
    );

    await client.query("COMMIT");
    return ins.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}