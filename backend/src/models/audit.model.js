import { pool } from "../config/db.js";

export async function writeAuditLog({ actorUserId, action, entityType, entityId, metadata }) {
  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
     VALUES ($1,$2,$3,$4,$5)`,
    [actorUserId ?? null, action, entityType, entityId ?? null, metadata ?? null]
  );
}

export async function getAuditLogs(limit = 50, offset = 0, filters = {}) {
  let whereClause = "";
  let params = [];
  let paramCounter = 1;

  // Build WHERE clause based on filters
  const conditions = [];
  
  if (filters.actorUserId) {
    conditions.push(`al.actor_user_id = $${paramCounter}`);
    params.push(filters.actorUserId);
    paramCounter++;
  }
  
  if (filters.action) {
    conditions.push(`al.action = $${paramCounter}`);
    params.push(filters.action);
    paramCounter++;
  }
  
  if (filters.entityType) {
    conditions.push(`al.entity_type = $${paramCounter}`);
    params.push(filters.entityType);
    paramCounter++;
  }
  
  if (filters.dateFrom) {
    conditions.push(`al.created_at >= $${paramCounter}`);
    params.push(filters.dateFrom);
    paramCounter++;
  }
  
  if (filters.dateTo) {
    conditions.push(`al.created_at <= $${paramCounter}`);
    params.push(filters.dateTo);
    paramCounter++;
  }
  
  if (conditions.length > 0) {
    whereClause = "WHERE " + conditions.join(" AND ");
  }

  const query = `
    SELECT 
      al.id,
      al.actor_user_id,
      u.full_name as actor_name,
      u.email as actor_email,
      al.action,
      al.entity_type,
      al.entity_id,
      al.metadata,
      al.created_at
    FROM audit_logs al
    LEFT JOIN users u ON al.actor_user_id = u.id
    ${whereClause}
    ORDER BY al.created_at DESC
    LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
  `;
  
  params.push(limit, offset);
  
  const result = await pool.query(query);
  
  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(*) as total
    FROM audit_logs al
    ${whereClause}
  `;
  
  const countResult = await pool.query(countQuery, params.slice(0, -2)); // Remove limit and offset
  
  return {
    rows: result.rows,
    total: parseInt(countResult.rows[0].total)
  };
}

export async function getAuditStats() {
  const query = `
    SELECT 
      COUNT(*) as total_logs,
      COUNT(DISTINCT actor_user_id) as unique_actors,
      COUNT(DISTINCT entity_type) as entity_types,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as logs_today,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as logs_week
    FROM audit_logs
  `;
  
  const result = await pool.query(query);
  return result.rows[0];
}