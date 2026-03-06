import { useState, useEffect } from 'react';
import { listUsers, setUserActive, createUser, deleteUser } from '../services/usersService';

export default function UserManagement() {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showToggleStatusModal, setShowToggleStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToAction, setUserToAction] = useState(null);

  // Data and loading states
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    roleCode: 'STAFF',
    officeId: '',
    sendWelcomeEmail: true,
    isActive: true
  });

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listUsers({ limit: 100, page: 1 });
      setUsers(response.data || []);
    } catch(err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      roleCode: 'STAFF',
      officeId: '',
      sendWelcomeEmail: true,
      isActive: true
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      if (modalMode === 'add') {
        if (!formData.fullName || !formData.email || !formData.password) {
          setActionError('Full name, email, and password are required');
          return;
        }
        const newUser = await createUser({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          roleCode: formData.roleCode,
          officeId: formData.roleCode === 'OFFICE' ? formData.officeId : null
        });
        setUsers([...users, newUser]);
        setShowModal(false);
        resetForm();
      }
    } catch(err) {
      console.error('Error saving user:', err);
      setActionError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      await setUserActive(userToAction.id, !userToAction.is_active);
      setUsers(users.map(u => u.id === userToAction.id ? { ...u, is_active: !u.is_active } : u));
      setShowToggleStatusModal(false);
      setUserToAction(null);
    } catch(err) {
      console.error('Error toggling user status:', err);
      setActionError(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      await deleteUser(userToAction.id);
      setUsers(users.filter(u => u.id !== userToAction.id));
      setShowDeleteModal(false);
      setUserToAction(null);
    } catch(err) {
      console.error('Error deleting user:', err);
      setActionError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  // Utility functions
  const openAddModal = () => {
    resetForm();
    setModalMode('add');
    setSelectedUser(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    resetForm();
  };

  const openToggleStatusModal = (userObj) => {
    setUserToAction(userObj);
    setShowToggleStatusModal(true);
  };

  const openDeleteModal = (userObj) => {
    setUserToAction(userObj);
    setShowDeleteModal(true);
  };

  const getRoleBadgeColor = (roleCode) => ({
    ADMIN: 'badge-error',
    STAFF: 'badge-info',
    OFFICE: 'badge-warning'
  }[roleCode] || 'badge');

  const getStatusBadgeColor = (isActive) => isActive ? 'badge-success' : 'badge-neutral';
  const getStatusIcon = (isActive) => isActive ? '✓' : '✕';

  // Filter and paginate
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role_code === filterRole;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.is_active : !u.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-base-200 p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Error Messages */}
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
            <button onClick={fetchUsers} className="btn btn-sm">Retry</button>
          </div>
        )}
        {actionError && (
          <div className="alert alert-error mb-4">
            <span>{actionError}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="mt-4 text-base-content/60">Loading users...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-base-content">User Management</h1>
                <p className="text-sm text-base-content/60 mt-1">Manage system users and their permissions</p>
              </div>
              <button onClick={openAddModal} className="btn btn-primary gap-2 w-full md:w-auto">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New User
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-base-100 rounded-lg p-4 border border-base-300">
                <p className="text-sm font-medium text-base-content/60">Total Users</p>
                <p className="text-3xl font-bold mt-2">{users.length}</p>
              </div>
              <div className="bg-base-100 rounded-lg p-4 border border-base-300">
                <p className="text-sm font-medium text-base-content/60">Active Users</p>
                <p className="text-3xl font-bold mt-2 text-success">{users.filter(u => u.is_active).length}</p>
              </div>
              <div className="bg-base-100 rounded-lg p-4 border border-base-300">
                <p className="text-sm font-medium text-base-content/60">Inactive Users</p>
                <p className="text-3xl font-bold mt-2 text-warning">{users.filter(u => !u.is_active).length}</p>
              </div>
              <div className="bg-base-100 rounded-lg p-4 border border-base-300">
                <p className="text-sm font-medium text-base-content/60">Admin Users</p>
                <p className="text-3xl font-bold mt-2 text-error">{users.filter(u => u.role_code === 'ADMIN').length}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-base-100 rounded-lg p-4 mb-6 border border-base-300">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="input input-bordered input-sm"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
                <select
                  className="select select-bordered select-sm"
                  value={filterRole}
                  onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="STAFF">Staff</option>
                  <option value="OFFICE">Office</option>
                </select>
                <select
                  className="select select-bordered select-sm"
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-base-100 rounded-lg overflow-hidden border border-base-300">
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr className="bg-base-200">
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Office</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.length > 0 ? (
                      paginatedUsers.map(userObj => (
                        <tr key={userObj.id} className="hover">
                          <td className="font-medium">{userObj.full_name}</td>
                          <td className="text-sm">{userObj.email}</td>
                          <td>
                            <span className={`badge ${getRoleBadgeColor(userObj.role_code)}`}>
                              {userObj.role_code}
                            </span>
                          </td>
                          <td className="text-sm">{userObj.office_name || '-'}</td>
                          <td>
                            <span className={`badge gap-1 ${getStatusBadgeColor(userObj.is_active)}`}>
                              <span>{getStatusIcon(userObj.is_active)}</span>
                              {userObj.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="text-sm">
                            {userObj.last_login_at ? new Date(userObj.last_login_at).toLocaleDateString() : 'Never'}
                          </td>
                          <td>
                            <div className="dropdown dropdown-end">
                              <button className="btn btn-ghost btn-sm gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                </svg>
                              </button>
                              <ul className="dropdown-content menu bg-base-100 rounded-box z-50 w-52 p-2 shadow border border-base-300">
                                <li>
                                  <button type="button" onClick={() => openToggleStatusModal(userObj)}>
                                    Toggle Status
                                  </button>
                                </li>
                                <li><hr className="my-1" /></li>
                                <li>
                                  <button type="button" className="text-error" onClick={() => openDeleteModal(userObj)}>
                                    Delete User
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-base-content/60">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 p-4 border-t border-base-300">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn btn-sm btn-ghost"
                  >
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-ghost'}`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn btn-sm btn-ghost"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Add User Modal */}
        {showModal && (
          <div className="modal modal-open">
            <div className="modal-box w-full max-w-2xl">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-base-300">
                <h3 className="font-bold text-xl">Add New User</h3>
                <button onClick={closeModal} className="btn btn-sm btn-ghost btn-circle">✕</button>
              </div>

              <form id="userForm" onSubmit={handleSaveUser} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Full Name *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Juan Dela Cruz"
                      className="input input-bordered w-full"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Email *</span>
                    </label>
                    <input
                      type="email"
                      placeholder="user@cpdo.gov.ph"
                      className="input input-bordered w-full"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Role *</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      name="roleCode"
                      value={formData.roleCode}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="STAFF">Staff Reviewer</option>
                      <option value="OFFICE">Office User</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Office</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      name="officeId"
                      value={formData.officeId}
                      onChange={handleFormChange}
                      disabled={formData.roleCode !== 'OFFICE'}
                    >
                      <option value="">No Office</option>
                      <option value="a1b2c3d4-e5f6-47a8-9b0c-1d2e3f4a5b6c">City Planning Office</option>
                      <option value="b2c3d4e5-f6a7-48b9-0c1d-2e3f4a5b6c7d">Regional Development Center</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Password *</span>
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="input input-bordered w-full"
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      required
                      minLength="8"
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Confirm Password *</span>
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="input input-bordered w-full"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleFormChange}
                      required
                      minLength="8"
                    />
                  </div>
                </div>
              </form>

              <div className="modal-action mt-8 pt-4 border-t border-base-300">
                <button type="button" onClick={closeModal} className="btn btn-ghost" disabled={actionLoading}>
                  Cancel
                </button>
                <button form="userForm" type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </> : 'Create User'}
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={closeModal}>
              <button>Close</button>
            </form>
          </div>
        )}

        {/* Toggle Status Modal */}
        {showToggleStatusModal && userToAction && (
          <div className="modal modal-open">
            <div className="modal-box w-full max-w-md">
              <button onClick={() => setShowToggleStatusModal(false)} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                ✕
              </button>
              <h3 className="font-bold text-lg mb-4">
                {userToAction.is_active ? 'Deactivate' : 'Activate'} User
              </h3>
              <p className="py-4">
                Are you sure you want to {userToAction.is_active ? 'deactivate' : 'activate'}{' '}
                <span className="font-semibold">{userToAction.full_name}</span>?
              </p>
              <div className="modal-action">
                <button onClick={() => setShowToggleStatusModal(false)} className="btn btn-ghost" disabled={actionLoading}>
                  Cancel
                </button>
                <button onClick={handleToggleStatus} className={`btn ${userToAction.is_active ? 'btn-warning' : 'btn-success'}`} disabled={actionLoading}>
                  {actionLoading ? <>
                    <span className="loading loading-spinner loading-sm"></span>
                  </> : (userToAction.is_active ? 'Deactivate' : 'Activate')}
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={() => setShowToggleStatusModal(false)}>
              <button>Close</button>
            </form>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && userToAction && (
          <div className="modal modal-open">
            <div className="modal-box w-full max-w-md">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                ✕
              </button>
              <h3 className="font-bold text-lg mb-4 text-error">Delete User</h3>
              <p className="py-4">
                Are you sure you want to permanently delete <span className="font-semibold">{userToAction.full_name}</span>?
              </p>
              <div className="modal-action">
                <button onClick={() => setShowDeleteModal(false)} className="btn btn-ghost" disabled={actionLoading}>
                  Cancel
                </button>
                <button onClick={handleDeleteUser} className="btn btn-error" disabled={actionLoading}>
                  {actionLoading ? <>
                    <span className="loading loading-spinner loading-sm"></span>
                  </> : 'Delete'}
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
              <button>Close</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
