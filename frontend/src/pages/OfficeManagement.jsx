import { useState, useEffect } from 'react';
import { listOffices, createOffice, updateOffice, setOfficeActive, deleteOffice } from '../services/officesService';

export default function OfficeManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOffices, setSelectedOffices] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [showToggleStatusModal, setShowToggleStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [officeToAction, setOfficeToAction] = useState(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState('');

  // Data and loading states
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactEmail: '',
    isActive: true
  });

  // Fetch offices on mount
  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listOffices();
      setOffices(response.data || []);
    } catch (err) {
      console.error('Error fetching offices:', err);
      setError(err.response?.data?.message || 'Failed to load offices');
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
      code: '',
      name: '',
      contactEmail: '',
      isActive: true
    });
  };

  const itemsPerPage = 10;

  // Filter logic
  const filteredOffices = offices.filter(office => {
    const matchesSearch = office.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         office.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (office.contact_email && office.contact_email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? office.is_active : !office.is_active);
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOffices.length / itemsPerPage);
  const paginatedOffices = filteredOffices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOffices(new Set(paginatedOffices.map(o => o.id)));
    } else {
      setSelectedOffices(new Set());
    }
  };

  const handleSelectOffice = (officeId, e) => {
    e.stopPropagation();
    const newSelected = new Set(selectedOffices);
    if (newSelected.has(officeId)) {
      newSelected.delete(officeId);
    } else {
      newSelected.add(officeId);
    }
    setSelectedOffices(newSelected);
  };

  const openAddModal = () => {
    setModalMode('add');
    setSelectedOffice(null);
    resetForm();
    setActionError(null);
    setShowModal(true);
  };

  const openEditModal = (officeObj) => {
    setModalMode('edit');
    setSelectedOffice(officeObj);
    setFormData({
      code: officeObj.code || '',
      name: officeObj.name || '',
      contactEmail: officeObj.contact_email || '',
      isActive: officeObj.is_active ?? true
    });
    setActionError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOffice(null);
    resetForm();
    setActionError(null);
  };

  const handleSaveOffice = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);

      if (modalMode === 'add') {
        if (!formData.code || !formData.name) {
          setActionError('Office code and name are required');
          return;
        }
        const newOffice = await createOffice({
          code: formData.code,
          name: formData.name,
          contactEmail: formData.contactEmail || null
        });
        setOffices([...offices, { ...newOffice, user_count: 0 }]);
        setShowModal(false);
        resetForm();
      } else {
        if (!formData.name) {
          setActionError('Office name is required');
          return;
        }
        const updates = {
          name: formData.name,
          contactEmail: formData.contactEmail || null
        };
        const updatedOffice = await updateOffice(selectedOffice.id, updates);
        setOffices(offices.map(o => o.id === selectedOffice.id ? { ...updatedOffice, user_count: o.user_count } : o));
        setShowModal(false);
        resetForm();
      }
    } catch (err) {
      console.error('Error saving office:', err);
      setActionError(err.response?.data?.message || 'Failed to save office');
    } finally {
      setActionLoading(false);
    }
  };

  const openToggleStatusModal = (officeObj, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setOfficeToAction(officeObj);
    setShowToggleStatusModal(true);
  };

  const closeToggleStatusModal = () => {
    setShowToggleStatusModal(false);
    setOfficeToAction(null);
    setActionError(null);
  };

  const openDeleteModal = (officeObj, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setOfficeToAction(officeObj);
    setDeleteConfirmCode('');
    setActionError(null);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setOfficeToAction(null);
    setDeleteConfirmCode('');
    setActionError(null);
  };

  const handleToggleStatus = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      const updatedOffice = await setOfficeActive(officeToAction.id, !officeToAction.is_active);
      setOffices(offices.map(o => o.id === officeToAction.id ? { ...o, is_active: updatedOffice.is_active } : o));
      closeToggleStatusModal();
    } catch (err) {
      console.error('Error toggling office status:', err);
      setActionError(err.response?.data?.message || 'Failed to update office status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOffice = async () => {
    if (deleteConfirmCode !== officeToAction?.code) {
      setActionError('Office code does not match');
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await deleteOffice(officeToAction.id);
      setOffices(offices.filter(o => o.id !== officeToAction.id));
      closeDeleteModal();
    } catch (err) {
      console.error('Error deleting office:', err);
      setActionError(err.response?.data?.message || 'Failed to delete office');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeColor = (isActive) => {
    return isActive ? 'badge-success' : 'badge-neutral';
  };

  const getStatusIcon = (isActive) => {
    return isActive ? '✓' : '✕';
  };

  return (
    <div className="bg-base-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-base-content">Office Management</h1>
            <p className="text-sm text-base-content/60 mt-1">Manage government offices and departments</p>
          </div>
          <button
            onClick={openAddModal}
            className="btn btn-primary gap-2 w-full md:w-auto"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Office
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-base-100 rounded-lg p-4 border border-base-300">
            <p className="text-sm font-medium text-base-content/60">Total Offices</p>
            <p className="text-3xl font-bold mt-2">{loading ? '-' : offices.length}</p>
          </div>
          <div className="bg-base-100 rounded-lg p-4 border border-base-300">
            <p className="text-sm font-medium text-base-content/60">Active Offices</p>
            <p className="text-3xl font-bold mt-2 text-success">{loading ? '-' : offices.filter(o => o.is_active).length}</p>
          </div>
          <div className="bg-base-100 rounded-lg p-4 border border-base-300">
            <p className="text-sm font-medium text-base-content/60">Inactive Offices</p>
            <p className="text-3xl font-bold mt-2 text-warning">{loading ? '-' : offices.filter(o => !o.is_active).length}</p>
          </div>
          <div className="bg-base-100 rounded-lg p-4 border border-base-300">
            <p className="text-sm font-medium text-base-content/60">Total Users</p>
            <p className="text-3xl font-bold mt-2 text-info">{loading ? '-' : offices.reduce((sum, o) => sum + (o.user_count || 0), 0)}</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error mb-6">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button onClick={fetchOffices} className="btn btn-sm btn-ghost">Retry</button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-base-100 rounded-lg p-4 mb-6 border border-base-300">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search by name, code, or email..."
              className="input input-bordered input-sm md:col-span-2"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <select
              className="select select-bordered select-sm"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {selectedOffices.size > 0 && (
              <button className="btn btn-ghost btn-sm gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete ({selectedOffices.size})
              </button>
            )}
          </div>
        </div>

        {/* Offices Table */}
        <div className="bg-base-100 rounded-lg overflow-hidden border border-base-300">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr className="bg-base-200">
                  <th>
                    <label>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        onChange={handleSelectAll}
                        checked={selectedOffices.size === paginatedOffices.length && paginatedOffices.length > 0}
                      />
                    </label>
                  </th>
                  <th>Code</th>
                  <th>Office Name</th>
                  <th>Contact Email</th>
                  <th>Users</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8">
                      <div className="flex flex-col items-center gap-3">
                        <span className="loading loading-spinner loading-lg"></span>
                        <p className="text-base-content/60">Loading offices...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedOffices.length > 0 ? (
                  paginatedOffices.map(officeObj => (
                    <tr key={officeObj.id} className="hover">
                      <th>
                        <label>
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={selectedOffices.has(officeObj.id)}
                            onChange={(e) => handleSelectOffice(officeObj.id, e)}
                          />
                        </label>
                      </th>
                      <td>
                        <span className="font-mono font-semibold text-primary">{officeObj.code}</span>
                      </td>
                      <td className="font-medium">{officeObj.name}</td>
                      <td className="text-sm">
                        {officeObj.contact_email ? (
                          <a href={`mailto:${officeObj.contact_email}`} className="link link-hover text-info">
                            {officeObj.contact_email}
                          </a>
                        ) : (
                          <span className="text-base-content/40">Not set</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-base-content/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="font-semibold">{officeObj.user_count}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge gap-1 ${getStatusBadgeColor(officeObj.is_active)}`}>
                          <span>{getStatusIcon(officeObj.is_active)}</span>
                          {officeObj.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-sm">
                        {new Date(officeObj.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="dropdown dropdown-end">
                          <button className="btn btn-ghost btn-sm gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                          </button>
                          <ul className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow border border-base-300">
                            <li>
                              <button type="button" onClick={() => openEditModal(officeObj)}>
                                Edit Office
                              </button>
                            </li>
                            <li>
                              <button type="button" onClick={() => alert(`View ${officeObj.user_count} users in ${officeObj.name}`)}>
                                View Users
                              </button>
                            </li>
                            <li>
                              <button type="button" onClick={(event) => openToggleStatusModal(officeObj, event)}>
                                Toggle Status
                              </button>
                            </li>
                            <li><hr className="my-1" /></li>
                            <li>
                              <button
                                type="button"
                                className="text-error"
                                onClick={(event) => openDeleteModal(officeObj, event)}
                              >
                                Delete Office
                              </button>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-base-content/60">
                      <div className="flex flex-col items-center gap-3">
                        <svg className="w-12 h-12 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="font-medium">No offices found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                      </div>
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
      </div>

      {/* Office Modal (Design Only) */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box w-full max-w-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-base-300">
              <div>
                <h3 className="font-bold text-xl">
                  {modalMode === 'add' ? 'Add New Office' : `Edit Office - ${selectedOffice?.name}`}
                </h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {modalMode === 'add' 
                    ? 'Create a new government office or department' 
                    : 'Update office information'}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="btn btn-sm btn-ghost btn-circle"
                disabled={actionLoading}
              >
                ✕
              </button>
            </div>

            {/* Error Alert */}
            {actionError && (
              <div className="alert alert-error mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{actionError}</span>
              </div>
            )}

            {/* Modal Body */}
            <form onSubmit={handleSaveOffice} className="space-y-5">
              {/* Office Code and Name Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Office Code *</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    placeholder="e.g., CPO, RDC, BPA"
                    className="input input-bordered w-full uppercase"
                    value={formData.code}
                    onChange={handleFormChange}
                    disabled={modalMode === 'edit' || actionLoading}
                    required
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">Unique identifier (uppercase)</span>
                  </label>
                </div>
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Office Name *</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g., City Planning Office"
                    className="input input-bordered w-full"
                    value={formData.name}
                    onChange={handleFormChange}
                    disabled={actionLoading}
                    required
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">Full official name</span>
                  </label>
                </div>
              </div>

              {/* Contact Email */}
              <div>
                <label className="label">
                  <span className="label-text font-semibold">Contact Email</span>
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  placeholder="office@cpdo.gov.ph"
                  className="input input-bordered w-full"
                  value={formData.contactEmail}
                  onChange={handleFormChange}
                  disabled={actionLoading}
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">Primary email for office correspondence</span>
                </label>
              </div>

              {/* Description/Notes - Removed as backend doesn't support it */}

              {/* Status Section - Only for Edit Mode */}
              {modalMode === 'edit' && (
                <div className="bg-base-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="label">
                        <span className="label-text font-semibold">Office Status</span>
                      </label>
                      <p className="text-sm text-base-content/70">
                        {selectedOffice?.is_active ? 'Office is active and can be assigned to users' : 'Office is inactive'}
                      </p>
                    </div>
                    <div className="form-control">
                      <label className="cursor-pointer label">
                        <span className="text-sm mr-2">Active</span>
                        <input 
                          type="checkbox" 
                          name="isActive"
                          className="toggle toggle-primary" 
                          checked={formData.isActive}
                          onChange={handleFormChange}
                          disabled={actionLoading}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata (Edit Mode) */}
              {modalMode === 'edit' && (
                <div className="bg-base-200/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Office ID:</span>
                    <code className="text-xs bg-base-100 px-2 py-1 rounded">{selectedOffice?.id}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Created:</span>
                    <span>{selectedOffice?.created_at ? new Date(selectedOffice.created_at).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Last Updated:</span>
                    <span>{selectedOffice?.updated_at ? new Date(selectedOffice.updated_at).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Total Users:</span>
                    <span className="font-semibold">{selectedOffice?.user_count || 0}</span>
                  </div>
                </div>
              )}

              {/* Warning for Edit Mode */}
              {modalMode === 'edit' && selectedOffice?.user_count > 0 && (
                <div className="alert alert-warning">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm">
                    This office has {selectedOffice.user_count} assigned user{selectedOffice.user_count !== 1 ? 's' : ''}. 
                    Deactivating may affect their access.
                  </span>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 mt-8 pt-4 border-t border-base-300">
                <button type="button" onClick={closeModal} className="btn btn-ghost" disabled={actionLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Saving...
                    </>
                  ) : (
                    <>{modalMode === 'add' ? 'Create Office' : 'Save Changes'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={closeModal}>
            <button>Close</button>
          </form>
        </div>
      )}

    {/* Toggle Status Modal */}
    {showToggleStatusModal && officeToAction && (
      <div className="modal modal-open">
        <div className="modal-box bg-base-100 rounded-lg shadow-lg">
          <button onClick={closeToggleStatusModal} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" disabled={actionLoading}>✕</button>
          <h3 className="font-bold text-lg mb-4">
            {officeToAction.is_active ? 'Deactivate Office' : 'Activate Office'}
          </h3>
          <div className="py-4">
            {actionError && (
              <div className="alert alert-error mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{actionError}</span>
              </div>
            )}
            <p className="text-base-content/80">
              Are you sure you want to {officeToAction.is_active ? 'deactivate' : 'activate'}{' '}
              <span className="font-semibold">{officeToAction.name}</span>?
            </p>
            {officeToAction.is_active ? (
              <div className="alert alert-warning mt-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm">This office will become inactive and users assigned to it may lose access.</span>
              </div>
            ) : (
              <div className="alert alert-info mt-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">This office will become active again.</span>
              </div>
            )}
          </div>
          <div className="modal-action">
            <button onClick={closeToggleStatusModal} className="btn btn-ghost" disabled={actionLoading}>Cancel</button>
            <button onClick={handleToggleStatus} className={`btn ${officeToAction.is_active ? 'btn-warning' : 'btn-success'}`} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Processing...
                </>
              ) : (
                <>{officeToAction.is_active ? 'Deactivate' : 'Activate'}</>
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={closeToggleStatusModal}>
          <button>Close</button>
        </form>
      </div>
    )}

    {/* Delete Office Modal */}
    {showDeleteModal && officeToAction && (
      <div className="modal modal-open">
        <div className="modal-box bg-base-100 rounded-lg shadow-lg w-full max-w-md">
          <button onClick={closeDeleteModal} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" disabled={actionLoading}>✕</button>
          <h3 className="font-bold text-lg mb-4 text-error">Delete Office</h3>
          <div className="py-4">
            {actionError && (
              <div className="alert alert-error mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{actionError}</span>
              </div>
            )}
            <p className="text-base-content/80 mb-4">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold">{officeToAction.name}</span>?
            </p>
            <div className="bg-error/10 border border-error/30 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-error shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-error">
                  <p className="font-semibold mb-1">This action cannot be undone!</p>
                  <ul className="list-disc list-inside space-y-1 text-error/90">
                    <li>All office data will be permanently deleted</li>
                    <li>{officeToAction.user_count || 0} user{(officeToAction.user_count || 0) !== 1 ? 's' : ''} assigned to this office will be affected</li>
                    <li>Audit logs will be preserved for compliance</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text font-semibold">Type the office code to confirm:</span>
              </label>
              <input
                type="text"
                placeholder={officeToAction.code}
                className="input input-bordered w-full uppercase"
                value={deleteConfirmCode}
                onChange={(e) => setDeleteConfirmCode(e.target.value.toUpperCase())}
                disabled={actionLoading}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">Enter: {officeToAction.code}</span>
              </label>
            </div>
          </div>
          <div className="modal-action">
            <button onClick={closeDeleteModal} className="btn btn-ghost" disabled={actionLoading}>Cancel</button>
            <button onClick={handleDeleteOffice} className="btn btn-error" disabled={actionLoading || deleteConfirmCode !== officeToAction.code}>
              {actionLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Deleting...
                </>
              ) : (
                'Delete Office'
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={closeDeleteModal}>
          <button>Close</button>
        </form>
      </div>
    )}
    </div>
  );
}
