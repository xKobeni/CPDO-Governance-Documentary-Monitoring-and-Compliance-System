import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Label } from '../components/ui/label';
import { 
  Search, 
  Download, 
  Filter, 
  Shield, 
  User,
  FileText,
  Calendar,
  Activity,
  Eye,
  AlertCircle,
  MoreVertical,
  Copy,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import the API functions
import { getAuditLogs, getAuditStats, exportAuditLogs } from '../api/audit-logs';
const actionTypes = [
  'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'SET_USER_ACTIVE',
  'CREATE_OFFICE', 'UPDATE_OFFICE', 'DELETE_OFFICE', 'SET_OFFICE_ACTIVE',
  'CREATE_TEMPLATE', 'UPDATE_TEMPLATE', 'DELETE_TEMPLATE',
  'CREATE_SUBMISSION', 'UPDATE_SUBMISSION', 'APPROVE_SUBMISSION', 'REJECT_SUBMISSION',
  'UPLOAD_FILE', 'DELETE_FILE',
  'SYSTEM_BACKUP', 'SYSTEM_MAINTENANCE'
];

const entityTypes = [
  'USER', 'OFFICE', 'TEMPLATE', 'SUBMISSION', 'FILE', 'SYSTEM', 'NOTIFICATION'
];

const getActionBadgeColor = (action) => {
  if (action.includes('DELETE')) return 'bg-red-100 text-red-800';
  if (action.includes('CREATE')) return 'bg-green-100 text-green-800';
  if (action.includes('UPDATE') || action.includes('APPROVE')) return 'bg-blue-100 text-blue-800';
  if (action.includes('REJECT')) return 'bg-orange-100 text-orange-800';
  if (action.includes('SYSTEM')) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
};

const getEntityIcon = (entityType) => {
  switch (entityType) {
    case 'USER': return User;
    case 'OFFICE': return Shield;
    case 'TEMPLATE': return FileText;
    case 'SUBMISSION': return FileText;
    case 'FILE': return FileText;
    case 'SYSTEM': return Activity;
    default: return AlertCircle;
  }
};

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState({
    totalLogs: 0,
    uniqueActors: 0,
    entityTypes: 0,
    logsToday: 0,
    logsWeek: 0
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Load data on component mount and when filters change (not search)
  useEffect(() => {
    loadAuditLogs();
  }, [pagination.page, pagination.limit, actionFilter, entityFilter, dateFilter]);

  // Load stats on component mount
  useEffect(() => {
    loadStats();
  }, []);

  // Client-side filtering for search (since backend doesn't support general text search)
  const filteredLogs = auditLogs.filter(log => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      (log.actorName?.toLowerCase() || '').includes(searchLower) ||
      (log.actorEmail?.toLowerCase() || '').includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.entityType.toLowerCase().includes(searchLower) ||
      (log.entityId?.toLowerCase() || '').includes(searchLower)
    );
  });

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      // Add filters if set
      if (actionFilter !== 'all') params.action = actionFilter;
      if (entityFilter !== 'all') params.entityType = entityFilter;
      
      // Handle date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let dateFrom;
        
        switch (dateFilter) {
          case 'today':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            dateFrom = new Date(now - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            dateFrom = new Date(now - 30 * 24 * 60 * 60 * 1000);
            break;
        }
        
        if (dateFrom) {
          params.dateFrom = dateFrom.toISOString();
        }
      }

      const response = await getAuditLogs(params);
      
      // Handle pagination response format
      const logsData = response.data || [];
      const formattedLogs = Array.isArray(logsData) ? logsData.map(log => ({
        ...log,
        actorName: log.actor_name,
        actorEmail: log.actor_email,
        entityType: log.entity_type,
        entityId: log.entity_id,
        createdAt: log.created_at
      })) : [];
      
      setAuditLogs(formattedLogs);
      
      // Update pagination info
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total,
          totalPages: response.pagination.pages
        }));
      }
      
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getAuditStats();
      const statsData = response.stats || response;
      
      setStats({
        totalLogs: parseInt(statsData.total_logs) || 0,
        uniqueActors: parseInt(statsData.unique_actors) || 0,
        entityTypes: parseInt(statsData.entity_types) || 0,
        logsToday: parseInt(statsData.logs_today) || 0,
        logsWeek: parseInt(statsData.logs_week) || 0
      });
    } catch (error) {
      console.error('Failed to load audit stats:', error);
      toast.error('Failed to load statistics');
    }
  };

  const handleExportLogs = async () => {
    try {
      setExporting(true);
      
      // Build export parameters based on current filters
      const params = {};
      if (actionFilter !== 'all') params.action = actionFilter;
      if (entityFilter !== 'all') params.entityType = entityFilter;
      
      // Handle date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let dateFrom;
        
        switch (dateFilter) {
          case 'today':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            dateFrom = new Date(now - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            dateFrom = new Date(now - 30 * 24 * 60 * 60 * 1000);
            break;
        }
        
        if (dateFrom) {
          params.dateFrom = dateFrom.toISOString();
        }
      }
      
      const blob = await exportAuditLogs(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Audit logs exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'action') setActionFilter(value);
    if (filterType === 'entity') setEntityFilter(value);
    if (filterType === 'date') setDateFilter(value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (val) => {
    setPagination(prev => ({ ...prev, limit: Number(val), page: 1 }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openDetailModal = (log) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const copyLogId = (logId) => {
    navigator.clipboard.writeText(logId);
    toast.success('Log ID copied to clipboard');
  };

  const copyMetadata = (metadata) => {
    navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
    toast.success('Metadata copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Monitor system activities and user actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadAuditLogs} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExportLogs} disabled={exporting || loading}>
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Logs
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[1,2,3,4,5].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueActors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entity Types</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.entityTypes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.logsToday}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.logsWeek}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>System Activity Log</CardTitle>
          <CardDescription>
            Comprehensive record of all system activities and user actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={(value) => handleFilterChange('action', value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={(value) => handleFilterChange('entity', value)}>
              <SelectTrigger className="w-full sm:w-45">
                <SelectValue placeholder="Filter by entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map(entity => (
                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(value) => handleFilterChange('date', value)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Audit Logs Table */}
          <div className="border rounded-md">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading audit logs...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const EntityIcon = getEntityIcon(log.entityType);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{log.actorName || 'System'}</div>
                              {log.actorEmail && (
                                <div className="text-sm text-muted-foreground">{log.actorEmail}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getActionBadgeColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <EntityIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{log.entityType}</span>
                            {log.entityId && (
                              <span className="text-sm text-muted-foreground font-mono">
                                ({log.entityId.substring(0, 8)}...)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.metadata && (
                            <div className="text-sm text-muted-foreground max-w-96 truncate">
                              {JSON.stringify(log.metadata, null, 0)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetailModal(log)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyLogId(log.id)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Log ID
                              </DropdownMenuItem>
                              {log.metadata && (
                                <DropdownMenuItem onClick={() => copyMetadata(log.metadata)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy Metadata
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {!loading && filteredLogs.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                No audit logs found matching your criteria.
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && pagination.total > 0 && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit + 1).toLocaleString()}–{Math.min(pagination.page * pagination.limit, pagination.total).toLocaleString()} of {pagination.total.toLocaleString()} log{pagination.total !== 1 ? 's' : ''}
                </p>
                <Select value={String(pagination.limit)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === pagination.totalPages || Math.abs(page - pagination.page) <= 1)
                  .reduce((acc, page, idx, arr) => {
                    if (idx > 0 && page - arr[idx - 1] > 1) acc.push('ellipsis-' + page);
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item) =>
                    typeof item === 'string' ? (
                      <span key={item} className="px-1 text-muted-foreground text-sm">…</span>
                    ) : (
                      <Button
                        key={item}
                        variant={item === pagination.page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(item)}
                        className="h-8 w-8 p-0"
                      >
                        {item}
                      </Button>
                    )
                  )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information for this audit log entry.
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="font-semibold">Timestamp</Label>
                <p className="text-sm">{formatDate(selectedLog.createdAt)}</p>
              </div>
              
              <div className="grid gap-2">
                <Label className="font-semibold">Actor</Label>
                <div>
                  <p className="text-sm font-medium">{selectedLog.actorName || 'System'}</p>
                  {selectedLog.actorEmail && (
                    <p className="text-sm text-muted-foreground">{selectedLog.actorEmail}</p>
                  )}
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label className="font-semibold">Action</Label>
                <div>
                  <Badge 
                    variant="outline" 
                    className={getActionBadgeColor(selectedLog.action)}
                  >
                    {selectedLog.action}
                  </Badge>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label className="font-semibold">Entity Type</Label>
                <p className="text-sm">{selectedLog.entityType}</p>
              </div>
              
              <div className="grid gap-2">
                <Label className="font-semibold">Entity ID</Label>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {selectedLog.entityId || 'N/A'}
                </p>
              </div>
              
              {selectedLog.metadata && (
                <div className="grid gap-2">
                  <Label className="font-semibold">Metadata</Label>
                  <pre className="text-sm bg-muted p-3 rounded overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}