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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Label } from '../components/ui/label';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Building2, 
  Users,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import the API functions
import { getOffices, createOffice, updateOffice, deleteOffice, toggleOfficeStatus } from '../api/offices';

export default function OfficesPage() {
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactEmail: '',
    isActive: true
  });

  // Load data on component mount
  useEffect(() => {
    loadOffices();
  }, []);

  const loadOffices = async () => {
    try {
      setLoading(true);
      const response = await getOffices();
      
      // Handle response format from backend
      const officesData = response.data || response;
      const formattedOffices = Array.isArray(officesData) ? officesData.map(office => ({
        ...office,
        isActive: office.is_active,
        contactEmail: office.contact_email,
        userCount: parseInt(office.user_count) || 0,
        createdAt: office.created_at
      })) : [];
      
      setOffices(formattedOffices);
    } catch (error) {
      console.error('Failed to load offices:', error);
      toast.error('Failed to load offices');
    } finally {
      setLoading(false);
    }
  };

  // Filter offices based on search and status
  const filteredOffices = offices.filter(office => {
    const matchesSearch = office.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         office.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && office.isActive) ||
                         (statusFilter === 'inactive' && !office.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOffices.length / pageSize));
  const paginatedOffices = filteredOffices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearchChange = (e) => { setSearchQuery(e.target.value); setCurrentPage(1); };
  const handleStatusFilterChange = (val) => { setStatusFilter(val); setCurrentPage(1); };
  const handlePageSizeChange = (val) => { setPageSize(Number(val)); setCurrentPage(1); };

  const handleCreateOffice = async () => {
    try {
      setSubmitting(true);
      const officeData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        contactEmail: formData.contactEmail.trim() || null
      };
      
      await createOffice(officeData);
      toast.success('Office created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      await loadOffices(); // Refresh the list
    } catch (error) {
      console.error('Failed to create office:', error);
      if (error.response?.status === 409) {
        toast.error('Office code already exists');
      } else {
        toast.error('Failed to create office');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOffice = async () => {
    try {
      setSubmitting(true);
      const officeData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        contactEmail: formData.contactEmail.trim() || null
      };
      
      await updateOffice(selectedOffice.id, officeData);
      toast.success('Office updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedOffice(null);
      await loadOffices(); // Refresh the list
    } catch (error) {
      console.error('Failed to update office:', error);
      if (error.response?.status === 409) {
        toast.error('Office code already exists');
      } else {
        toast.error('Failed to update office');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (officeId) => {
    try {
      const office = offices.find(o => o.id === officeId);
      await toggleOfficeStatus(officeId, !office.isActive);
      toast.success(`Office ${!office.isActive ? 'activated' : 'deactivated'} successfully`);
      await loadOffices(); // Refresh the list
    } catch (error) {
      console.error('Failed to toggle office status:', error);
      toast.error('Failed to update office status');
    }
  };

  const handleDeleteOffice = async (officeId) => {
    const office = offices.find(o => o.id === officeId);
    if (office?.userCount > 0) {
      toast.error('Cannot delete office with associated users. Please reassign users first.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this office?')) {
      try {
        await deleteOffice(officeId);
        toast.success('Office deleted successfully');
        await loadOffices(); // Refresh the list
      } catch (error) {
        console.error('Failed to delete office:', error);
        if (error.response?.status === 409) {
          toast.error('Cannot delete office with associated users');
        } else {
          toast.error('Failed to delete office');
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      contactEmail: '',
      isActive: true
    });
  };

  const openEditDialog = (office) => {
    setSelectedOffice(office);
    setFormData({
      code: office.code,
      name: office.name,
      contactEmail: office.contactEmail || '',
      isActive: office.isActive
    });
    setIsEditDialogOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Office Management</h1>
          <p className="text-muted-foreground">
            Manage office hierarchy and organizational structure
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add Office
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Office</DialogTitle>
              <DialogDescription>
                Add a new office to the organizational structure.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">
                  Office Code *
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  placeholder="e.g., CPO"
                  maxLength={20}
                  className="col-span-3"
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Office Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  placeholder="Enter office name"
                  maxLength={200}
                  className="col-span-3"
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contactEmail" className="text-right">
                  Contact Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  placeholder="office@cpdo.gov.ph"
                  className="col-span-3"
                  onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateOffice}
                disabled={!formData.code || !formData.name || submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Office
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Offices</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Offices</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offices.filter(o => o.isActive).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Offices</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offices.filter(o => !o.isActive).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offices.reduce((sum, office) => sum + office.userCount, 0)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Office Directory</CardTitle>
          <CardDescription>
            Manage and organize your office structure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-45">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Offices Table */}
          <div className="border rounded-md">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading offices...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Office</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOffices.map((office) => (
                    <TableRow key={office.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div className="font-medium">{office.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {office.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {office.contactEmail ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {office.contactEmail}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {office.userCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={office.isActive ? 'default' : 'secondary'}>
                          {office.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(office.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(office)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Office
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(office.id)}>
                              {office.isActive ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteOffice(office.id)}
                              className="text-red-600"
                              disabled={office.userCount > 0}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Office
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!loading && filteredOffices.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                No offices found matching your criteria.
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && filteredOffices.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredOffices.length)} of {filteredOffices.length} office{filteredOffices.length !== 1 ? 's' : ''}
                </p>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 / page</SelectItem>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
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
                        variant={item === currentPage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(item)}
                        className="h-8 w-8 p-0"
                      >
                        {item}
                      </Button>
                    )
                  )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Office Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Office</DialogTitle>
            <DialogDescription>
              Update office information and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-code" className="text-right">
                Office Code *
              </Label>
              <Input
                id="edit-code"
                value={formData.code}
                placeholder="e.g., CPO"
                maxLength={20}
                className="col-span-3"
                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Office Name *
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                placeholder="Enter office name"
                maxLength={200}
                className="col-span-3"
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-contactEmail" className="text-right">
                Contact Email
              </Label>
              <Input
                id="edit-contactEmail"
                type="email"
                value={formData.contactEmail}
                placeholder="office@cpdo.gov.ph"
                className="col-span-3"
                onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
                setSelectedOffice(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditOffice}
              disabled={!formData.code || !formData.name || submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Office
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}