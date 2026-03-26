import { z } from "zod";
import { getAuditLogs, getAuditStats } from "../models/audit.model.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";

const auditFiltersSchema = z.object({
  actorUserId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

/**
 * Get audit logs with filtering and pagination
 * @route GET /audit-logs
 */
export async function getAuditLogsHandler(req, res) {
  const { limit, offset, page } = getPaginationParams(req, 50, 100);
  
  // Validate filters
  const parsed = auditFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid filter parameters",
      errors: parsed.error.flatten()
    });
  }

  const filters = { ...parsed.data };

  // Non-admin users can only see their own activity
  if (req.user.role !== "ADMIN") {
    filters.actorUserId = req.user.sub;
  }

  const { rows, total } = await getAuditLogs(limit, offset, filters);
  return res.json(formatPaginatedResponse(rows, total, page, limit));
}

/**
 * Get audit log statistics
 * @route GET /audit-logs/stats
 */
export async function getAuditStatsHandler(req, res) {
  const userId = req.user.role !== "ADMIN" ? req.user.sub : null;
  const stats = await getAuditStats(userId);
  return res.json({ stats });
}

/**
 * Export audit logs to CSV
 * @route GET /audit-logs/export
 */
export async function exportAuditLogsHandler(req, res) {
  const parsed = auditFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid filter parameters",
      errors: parsed.error.flatten()
    });
  }

  const filters = { ...parsed.data };

  // Non-admin users can only export their own activity
  if (req.user.role !== "ADMIN") {
    filters.actorUserId = req.user.sub;
  }

  // Get all matching logs (up to 10000 for export)
  const { rows } = await getAuditLogs(10000, 0, filters);
  
  // Convert to CSV
  const headers = ['Timestamp', 'Actor', 'Action', 'Entity Type', 'Entity ID', 'Metadata'];
  const csvRows = [headers.join(',')];
  
  for (const row of rows) {
    const csvRow = [
      new Date(row.created_at).toISOString(),
      row.actor_name || 'System',
      row.action,
      row.entity_type,
      row.entity_id || '',
      JSON.stringify(row.metadata || {})
    ].map(field => `"${String(field).replace(/"/g, '""')}"`);
    csvRows.push(csvRow.join(','));
  }
  
  const csv = csvRows.join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
  return res.send(csv);
}