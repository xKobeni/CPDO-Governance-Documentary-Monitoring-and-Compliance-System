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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Label } from '../components/ui/label';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Building2, 
  Users,
  Mail,
  CheckCircle,
  XCircle,
  Loader2
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

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Office Directory</CardTitle>
          <CardDescription>
            Manage and organize your office structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-500">
                {filteredOffices.length} of {offices.length} offices
              </span>
            </div>
          </div>

          {/* Offices Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading offices...</span>
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
              {filteredOffices.map((office) => (
                <TableRow key={office.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">{office.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {office.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      {office.contactEmail ? (
                        <>
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{office.contactEmail}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Not set</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3 text-gray-400" />
                      <span className="text-sm">{office.userCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={office.isActive ? "success" : "secondary"}
                      className={office.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {office.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(office.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
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
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No offices found</h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'Get started by creating your first office.'
                }
              </p>
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