import { pool } from "../config/db.js";

export async function writeAuditLog({ actorUserId, action, entityType, entityId, metadata }) {
  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
     VALUES ($1,$2,$3,$4,$5)`,
    [actorUserId ?? null, action, entityType, entityId ?? null, metadata ?? null]
  );
}