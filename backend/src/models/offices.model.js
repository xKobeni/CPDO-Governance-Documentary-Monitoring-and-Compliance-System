import { pool } from "../config/db.js";

/**
 * Create a new office
 * @param {Object} params Office data
 * @param {string} params.code Office code (unique)
 * @param {string} params.name Office name
 * @param {string} [params.contactEmail] Contact email
 * @returns {Promise<Object>} Created office
 */
export async function createOffice({ code, name, contactEmail }) {
  const { rows } = await pool.query(
    `INSERT INTO offices (code, name, contact_email)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [code, name, contactEmail ?? null]
  );
  return rows[0];
}

/**
 * Get all offices
 * @returns {Promise<Array>} List of offices
 */
export async function listOffices() {
  const { rows } = await pool.query(
    `SELECT 
      o.id, 
      o.code, 
      o.name, 
      o.contact_email, 
      o.is_active, 
      o.created_at, 
      o.updated_at,
      COUNT(u.id) FILTER (WHERE u.is_active = true) AS user_count
     FROM offices o
     LEFT JOIN users u ON u.office_id = o.id
     GROUP BY o.id, o.code, o.name, o.contact_email, o.is_active, o.created_at, o.updated_at
     ORDER BY o.name`
  );
  return rows;
}

/**
 * Get a single office by ID
 * @param {string} officeId Office ID
 * @returns {Promise<Object|null>} Office or null if not found
 */
export async function getOfficeById(officeId) {
  const { rows } = await pool.query(
    `SELECT 
      o.id, 
      o.code, 
      o.name, 
      o.contact_email, 
      o.is_active, 
      o.created_at, 
      o.updated_at,
      COUNT(u.id) FILTER (WHERE u.is_active = true) AS user_count
     FROM offices o
     LEFT JOIN users u ON u.office_id = o.id
     WHERE o.id = $1
     GROUP BY o.id, o.code, o.name, o.contact_email, o.is_active, o.created_at, o.updated_at`,
    [officeId]
  );
  return rows[0] || null;
}

/**
 * Update office details
 * @param {string} officeId Office ID
 * @param {Object} updates Fields to update
 * @param {string} [updates.code] Office code
 * @param {string} [updates.name] Office name
 * @param {string} [updates.contactEmail] Contact email
 * @returns {Promise<Object|null>} Updated office or null if not found
 */
export async function updateOffice(officeId, updates) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updates.code !== undefined) {
    fields.push(`code = $${paramIndex++}`);
    values.push(updates.code);
  }
  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.contactEmail !== undefined) {
    fields.push(`contact_email = $${paramIndex++}`);
    values.push(updates.contactEmail || null);
  }

  if (fields.length === 0) {
    return getOfficeById(officeId);
  }

  values.push(officeId);
  const { rows } = await pool.query(
    `UPDATE offices 
     SET ${fields.join(", ")}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );
  return rows[0] || null;
}

/**
 * Set office active status
 * @param {string} officeId Office ID
 * @param {boolean} isActive Active status
 * @returns {Promise<Object|null>} Updated office or null if not found
 */
export async function setOfficeActive(officeId, isActive) {
  const { rows } = await pool.query(
    `UPDATE offices 
     SET is_active = $1
     WHERE id = $2
     RETURNING *`,
    [isActive, officeId]
  );
  return rows[0] || null;
}

/**
 * Delete an office
 * Note: Will fail if office has associated users due to RESTRICT constraint
 * @param {string} officeId Office ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteOffice(officeId) {
  const { rowCount } = await pool.query(
    `DELETE FROM offices WHERE id = $1`,
    [officeId]
  );
  return rowCount > 0;
}