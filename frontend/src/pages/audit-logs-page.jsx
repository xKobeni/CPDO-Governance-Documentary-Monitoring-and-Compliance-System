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
  ExternalLink
} from 'lucide-react';

// Mock data for demonstration - replace with actual API calls
// Import the API functions: import { getAuditLogs, getAuditStats, exportAuditLogs } from '../api/audit-logs';
const mockAuditLogs = [
  {
    id: '1',
    actorUserId: 'user1',
    actorName: 'Juan Dela Cruz',
    actorEmail: 'juan.delacruz@cpdo.gov.ph',
    action: 'CREATE_USER',
    entityType: 'USER',
    entityId: 'user123',
    metadata: { email: 'new.user@cpdo.gov.ph', role: 'STAFF' },
    createdAt: '2024-03-09T10:30:00Z'
  },
  {
    id: '2',
    actorUserId: 'user2',
    actorName: 'Maria Santos',
    actorEmail: 'maria.santos@cpdo.gov.ph',
    action: 'APPROVE_SUBMISSION',
    entityType: 'SUBMISSION',
    entityId: 'sub456',
    metadata: { submissionTitle: 'Budget Report Q1', comments: 'Approved with minor revisions' },
    createdAt: '2024-03-09T09:15:00Z'
  },
  {
    id: '3',
    actorUserId: null,
    actorName: null,
    actorEmail: null,
    action: 'SYSTEM_BACKUP',
    entityType: 'SYSTEM',
    entityId: null,
    metadata: { backupSize: '2.5GB', status: 'success' },
    createdAt: '2024-03-09T02:00:00Z'
  },
  {
    id: '4',
    actorUserId: 'user1',
    actorName: 'Juan Dela Cruz',
    actorEmail: 'juan.delacruz@cpdo.gov.ph',
    action: 'DELETE_FILE',
    entityType: 'FILE',
    entityId: 'file789',
    metadata: { fileName: 'old-report.pdf', reason: 'Outdated document' },
    createdAt: '2024-03-08T16:45:00Z'
  },
  {
    id: '5',
    actorUserId: 'user3',
    actorName: 'Pedro Garcia',
    actorEmail: 'pedro.garcia@cpdo.gov.ph',
    action: 'UPDATE_TEMPLATE',
    entityType: 'TEMPLATE',
    entityId: 'tpl101',
    metadata: { templateName: 'Quarterly Report Template', changes: ['Added new fields', 'Updated validation'] },
    createdAt: '2024-03-08T14:20:00Z'
  }
];

const mockStats = {
  totalLogs: 1247,
  uniqueActors: 23,
  entityTypes: 8,
  logsToday: 15,
  logsWeek: 89
};

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
  const [auditLogs, setAuditLogs] = useState(mockAuditLogs);
  const [stats, setStats] = useState(mockStats);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filter logs based on search and filters
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = (log.actorName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (log.actorEmail?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.entityType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const logDate = new Date(log.createdAt);
      const now = new Date();
      const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      
      if (dateFilter === 'today') matchesDate = logDate >= dayAgo;
      else if (dateFilter === 'week') matchesDate = logDate >= weekAgo;
      else if (dateFilter === 'month') matchesDate = logDate >= monthAgo;
    }
    
    return matchesSearch && matchesAction && matchesEntity && matchesDate;
  });

  const handleExportLogs = async () => {
    try {
      // In a real app, this would call exportAuditLogs API
      // const blob = await exportAuditLogs({ /* current filters */ });
      // const url = window.URL.createObjectURL(blob);
      // const link = document.createElement('a');
      // link.href = url;
      // link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      // link.click();
      // window.URL.revokeObjectURL(url);
      
      alert('Export functionality not implemented in demo mode');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export audit logs');
    }
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
    // In a real app, show a toast notification
  };

  const copyMetadata = (metadata) => {
    navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
    // In a real app, show a toast notification
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
        <Button onClick={handleExportLogs}>
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Statistics Cards */}
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

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>System Activity Log</CardTitle>
          <CardDescription>
            Comprehensive record of all system activities and user actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map(entity => (
                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-500">
                {filteredLogs.length} of {auditLogs.length} logs
              </span>
            </div>
          </div>

          {/* Audit Logs Table */}
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
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{log.actorName || 'System'}</div>
                          {log.actorEmail && (
                            <div className="text-sm text-gray-500">{log.actorEmail}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getActionBadgeColor(log.action)}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <EntityIcon className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{log.entityType}</span>
                        {log.entityId && (
                          <span className="text-sm text-gray-500 font-mono">
                            ({log.entityId.substring(0, 8)}...)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.metadata && (
                        <div className="text-sm text-gray-600 max-w-96 truncate">
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

          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No audit logs found</h3>
              <p className="text-gray-500">
                {searchQuery || actionFilter !== 'all' || entityFilter !== 'all' || dateFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'System activities will appear here as they occur.'
                }
              </p>
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