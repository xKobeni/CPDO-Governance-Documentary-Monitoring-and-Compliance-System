import { writeAuditLog } from "../models/audit.model.js";

export function audit(action, entityType, getEntityId = null, getMetadata = null) {
  return async (req, res, next) => {
    res.on("finish", async () => {
      // only log successful-ish actions
      if (res.statusCode >= 400) return;

      try {
        const actorUserId = req.user?.sub ?? null;
        const entityId = getEntityId ? getEntityId(req) : null;
        const metadata = getMetadata ? getMetadata(req) : null;

        await writeAuditLog({
          actorUserId,
          action,
          entityType,
          entityId,
          metadata,
        });
      } catch {
        // never break request due to audit logging
      }
    });
    next();
  };
}