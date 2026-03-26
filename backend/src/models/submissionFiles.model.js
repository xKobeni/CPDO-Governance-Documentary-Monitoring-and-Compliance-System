import { pool } from "../config/db.js";

export async function getSubmissionFileById(fileId) {
  const { rows } = await pool.query(
    `SELECT sf.id, sf.submission_id, sf.version_no, sf.file_name, sf.mime_type,
            sf.file_size_bytes, sf.storage_key, sf.sha256, sf.uploaded_by, sf.uploaded_at,
            s.office_id
     FROM submission_files sf
     JOIN submissions s ON s.id = sf.submission_id
     WHERE sf.id = $1`,
    [fileId]
  );
  return rows[0] || null;
}

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

export async function getUserTotalUploadedBytes(userId) {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(file_size_bytes), 0)::BIGINT AS total
     FROM submission_files
     WHERE uploaded_by = $1`,
    [userId]
  );
  return Number(rows[0]?.total ?? 0);
}

/**
 * Deletes a file record and promotes the previous version to current (transaction-safe).
 * Returns the deleted row so the caller can clean up B2.
 */
export async function deleteFileRecord(fileId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const del = await client.query(
      `DELETE FROM submission_files WHERE id = $1 RETURNING *`,
      [fileId]
    );
    const deleted = del.rows[0];
    if (!deleted) {
      await client.query("ROLLBACK");
      return null;
    }

    // If the deleted file was current, promote the next most-recent version
    if (deleted.is_current) {
      await client.query(
        `UPDATE submission_files
         SET is_current = TRUE
         WHERE id = (
           SELECT id FROM submission_files
           WHERE submission_id = $1
           ORDER BY version_no DESC
           LIMIT 1
         )`,
        [deleted.submission_id]
      );
    }

    await client.query("COMMIT");
    return deleted;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
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
       FROM (SELECT version_no FROM submission_files WHERE submission_id = $1 FOR UPDATE) sub`,
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