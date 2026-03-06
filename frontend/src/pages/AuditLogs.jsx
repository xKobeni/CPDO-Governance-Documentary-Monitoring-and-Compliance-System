import { useState } from 'react';

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [dateRange, setDateRange] = useState('7days');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sample audit log data aligned with database schema
  const allLogs = [
    { id: 1, actor_user_id: 'user-001', actor_name: 'John Doe', action: 'UPLOAD_FILE', entity_type: 'SUBMISSION', entity_id: 'sub-001', metadata: { file_name: 'report.pdf', file_size: '2.5MB' }, created_at: '2024-03-05T14:32:45Z', ip_address: '192.168.1.100' },
    { id: 2, actor_user_id: 'user-002', actor_name: 'Jane Smith', action: 'CREATE_SUBMISSION', entity_type: 'SUBMISSION', entity_id: 'sub-002', metadata: { governance_area: 'GA01', office: 'Planning Division' }, created_at: '2024-03-05T14:28:12Z', ip_address: '192.168.1.101' },
    { id: 3, actor_user_id: 'admin-001', actor_name: 'Admin User', action: 'DELETE_USER', entity_type: 'USER', entity_id: 'user-999', metadata: { deleted_user_email: 'test@example.com' }, created_at: '2024-03-05T13:45:30Z', ip_address: '192.168.1.102' },
    { id: 4, actor_user_id: 'user-001', actor_name: 'John Doe', action: 'LOGIN_FAILED', entity_type: 'AUTH', entity_id: null, metadata: { reason: 'invalid_password' }, created_at: '2024-03-05T12:15:22Z', ip_address: '203.0.113.45' },
    { id: 5, actor_user_id: 'user-003', actor_name: 'Mike Johnson', action: 'GENERATE_REPORT', entity_type: 'REPORT', entity_id: 'report-001', metadata: { year: 2024, quarter: 'Q1', format: 'PDF' }, created_at: '2024-03-05T11:50:18Z', ip_address: '192.168.1.103' },
    { id: 6, actor_user_id: 'user-004', actor_name: 'Sarah Williams', action: 'UPDATE_SETTINGS', entity_type: 'USER', entity_id: 'user-004', metadata: { changed_fields: ['two_factor_auth'] }, created_at: '2024-03-05T10:22:05Z', ip_address: '192.168.1.104' },
    { id: 7, actor_user_id: 'user-001', actor_name: 'John Doe', action: 'UPLOAD_FILE', entity_type: 'SUBMISSION', entity_id: 'sub-003', metadata: { file_name: 'annual_report.docx', file_size: '1.2MB' }, created_at: '2024-03-04T16:45:33Z', ip_address: '192.168.1.100' },
    { id: 8, actor_user_id: 'user-005', actor_name: 'Robert Brown', action: 'APPROVE', entity_type: 'SUBMISSION', entity_id: 'sub-001', metadata: { decision: 'APPROVED', notes: 'All requirements met' }, created_at: '2024-03-04T15:30:12Z', ip_address: '192.168.1.105' },
    { id: 9, actor_user_id: 'admin-001', actor_name: 'Admin User', action: 'UPDATE_USER_ROLE', entity_type: 'USER', entity_id: 'user-002', metadata: { old_role: 'STAFF', new_role: 'OFFICE' }, created_at: '2024-03-04T14:20:45Z', ip_address: '192.168.1.102' },
    { id: 10, actor_user_id: 'user-001', actor_name: 'John Doe', action: 'CHANGE_PASSWORD', entity_type: 'USER', entity_id: 'user-001', metadata: {}, created_at: '2024-03-04T13:10:22Z', ip_address: '192.168.1.100' },
    { id: 11, actor_user_id: 'user-006', actor_name: 'Emily Davis', action: 'CREATE_TEMPLATE', entity_type: 'TEMPLATE', entity_id: 'tmpl-001', metadata: { governance_area: 'GA02', year: 2024 }, created_at: '2024-03-04T12:05:18Z', ip_address: '192.168.1.106' },
    { id: 12, actor_user_id: 'admin-001', actor_name: 'Admin User', action: 'LOGIN_SUCCESS', entity_type: 'AUTH', entity_id: null, metadata: {}, created_at: '2024-03-04T09:30:55Z', ip_address: '192.168.1.102' },
  ];

  // Filter logs
  const filteredLogs = allLogs.filter(log => {
    const matchesSearch = log.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.entity_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesEntity = filterEntity === 'all' || log.entity_type === filterEntity;
    return matchesSearch && matchesAction && matchesEntity;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  const getEntityBadge = (entityType) => {
    const badges = {
      SUBMISSION: 'badge-info',
      USER: 'badge-secondary',
      TEMPLATE: 'badge-primary',
      REPORT: 'badge-accent',
      AUTH: 'badge-ghost'
    };
    return badges[entityType] || 'badge-ghost';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const uniqueActions = [...new Set(allLogs.map(log => log.action))];
  const uniqueEntityTypes = [...new Set(allLogs.map(log => log.entity_type))];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-6 border-b border-base-300">
        <h1 className="text-4xl font-bold text-base-content">Audit Logs</h1>
        <p className="text-base-content/70 mt-2">Track all system activities and user actions</p>
      </div>

      {/* Filters and Search */}
      <div className="card bg-base-100 shadow-sm border border-base-300 rounded-2xl">
        <div className="card-body">
          <h2 className="card-title text-base-content mb-4">Filters & Search</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="form-control">
              <label className="label pb-2">
                <span className="label-text font-semibold text-base-content">Search</span>
              </label>
              <input
                type="text"
                placeholder="Search by user, action, or details..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="input input-bordered w-full bg-base-100 rounded-lg"
              />
            </div>

            {/* Action Filter */}
            <div className="form-control">
              <label className="label pb-2">
                <span className="label-text font-semibold text-base-content">Action Type</span>
              </label>
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setCurrentPage(1);
                }}
                className="select select-bordered w-full bg-base-100 rounded-lg"
              >
                <option value="all">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* Entity Type Filter */}
            <div className="form-control">
              <label className="label pb-2">
                <span className="label-text font-semibold text-base-content">Entity Type</span>
              </label>
              <select
                value={filterEntity}
                onChange={(e) => {
                  setFilterEntity(e.target.value);
                  setCurrentPage(1);
                }}
                className="select select-bordered w-full bg-base-100 rounded-lg"
              >
                <option value="all">All Entities</option>
                {uniqueEntityTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="form-control">
              <label className="label pb-2">
                <span className="label-text font-semibold text-base-content">Date Range</span>
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="select select-bordered w-full bg-base-100 rounded-lg"
              >
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          {/* Results Info */}
          <div className="mt-4 pt-4 border-t border-base-300 flex items-center justify-between">
            <p className="text-sm text-base-content/70">
              Showing <span className="font-semibold text-base-content">{paginatedLogs.length}</span> of <span className="font-semibold text-base-content">{filteredLogs.length}</span> logs
            </p>
            {filteredLogs.length === 0 && (
              <button className="btn btn-sm btn-outline btn-primary">
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card bg-base-100 shadow-sm border border-base-300 rounded-2xl overflow-hidden">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead className="bg-base-200 border-b-2 border-base-300">
                <tr>
                  <th className="text-base-content/80 font-semibold">Action</th>
                  <th className="text-base-content/80 font-semibold">User</th>
                  <th className="text-base-content/80 font-semibold hidden md:table-cell">Entity Type</th>
                  <th className="text-base-content/80 font-semibold hidden lg:table-cell">Entity ID</th>
                  <th className="text-base-content/80 font-semibold hidden lg:table-cell">IP Address</th>
                  <th className="text-base-content/80 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-base-200 transition-colors">
                      <td>
                        <span className="font-medium text-base-content">{log.action}</span>
                      </td>
                      <td>
                        <span className="text-base-content">{log.actor_name}</span>
                      </td>
                      <td className="hidden md:table-cell">
                        <span className={`badge ${getEntityBadge(log.entity_type)} badge-sm`}>
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell">
                        <p className="text-sm text-base-content/70 font-mono truncate max-w-xs">
                          {log.entity_id || 'N/A'}
                        </p>
                      </td>
                      <td className="hidden lg:table-cell">
                        <p className="text-sm text-base-content/70 font-mono">{log.ip_address}</p>
                      </td>
                      <td>
                        <p className="text-xs text-base-content/70">{formatTimestamp(log.created_at)}</p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-8">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg className="w-12 h-12 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-base-content/70 font-medium">No logs found</p>
                        <p className="text-base-content/50 text-sm">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="btn btn-sm btn-outline btn-primary"
          >
            Previous
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`btn btn-sm ${
                  page === currentPage
                    ? 'btn-primary'
                    : 'btn-outline'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-sm btn-outline btn-primary"
          >
            Next
          </button>
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <button className="btn btn-outline btn-primary rounded-lg gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Logs
        </button>
      </div>
    </div>
  );
}
