import { useState } from 'react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'SUBMISSION_RECEIVED',
      title: 'New Submission Received',
      body: 'A new submission has been received from Planning Office for Governance Area GA01.',
      link_submission_id: 'sub-001',
      created_at: '2024-03-05T12:30:00Z',
      is_read: false
    },
    {
      id: 2,
      type: 'APPROVED',
      title: 'Submission Approved',
      body: 'Your submission for Financial Transparency (GA02) has been approved by the administrator.',
      link_submission_id: 'sub-002',
      created_at: '2024-03-05T09:15:00Z',
      is_read: false
    },
    {
      id: 3,
      type: 'REVISION_REQUESTED',
      title: 'Revision Requested',
      body: 'Your submission requires revision. Please review the comments and resubmit.',
      link_submission_id: 'sub-003',
      created_at: '2024-03-04T16:00:00Z',
      is_read: true
    },
    {
      id: 4,
      type: 'DENIED',
      title: 'Submission Denied',
      body: 'Your submission for Governance Area GA05 has been denied. Check the decision notes for details.',
      link_submission_id: 'sub-004',
      created_at: '2024-03-04T14:20:00Z',
      is_read: true
    },
    {
      id: 5,
      type: 'SUBMISSION_RECEIVED',
      title: 'New Submission Received',
      body: 'Engineering Office submitted documents for Procurement Process (GA03).',
      link_submission_id: 'sub-005',
      created_at: '2024-03-03T11:45:00Z',
      is_read: true
    },
    {
      id: 6,
      type: 'APPROVED',
      title: 'Submission Approved',
      body: 'Submission for Environmental Office has been approved for Governance Area GA08.',
      link_submission_id: 'sub-006',
      created_at: '2024-03-02T10:30:00Z',
      is_read: true
    },
    {
      id: 7,
      type: 'SUBMISSION_RECEIVED',
      title: 'New Submission Received',
      body: 'Urban Planning Office submitted annual compliance report.',
      link_submission_id: 'sub-007',
      created_at: '2024-02-28T15:00:00Z',
      is_read: true
    },
    {
      id: 8,
      type: 'REVISION_REQUESTED',
      title: 'Revision Requested',
      body: 'Additional documents required for your submission. Please upload missing files.',
      link_submission_id: 'sub-008',
      created_at: '2024-02-25T09:00:00Z',
      is_read: true
    }
  ]);

  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter notifications
  const filteredNotifications = notifications.filter(notif => {
    const matchesCategory = filterCategory === 'all' || notif.type === filterCategory;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'unread' ? !notif.is_read : notif.is_read);
    const matchesSearch = notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (notif.body && notif.body.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const readCount = notifications.filter(n => n.is_read).length;

  const getBadgeColor = (type) => {
    const colors = {
      'SUBMISSION_RECEIVED': 'badge-info',
      'APPROVED': 'badge-success',
      'DENIED': 'badge-error',
      'REVISION_REQUESTED': 'badge-warning'
    };
    return colors[type] || 'badge-primary';
  };

  const getTypeLabel = (type) => {
    const labels = {
      'SUBMISSION_RECEIVED': 'Submission Received',
      'APPROVED': 'Approved',
      'DENIED': 'Denied',
      'REVISION_REQUESTED': 'Revision Requested'
    };
    return labels[type] || type;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    ));
  };

  const markAsUnread = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, is_read: false } : n
    ));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-6 border-b border-base-300 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-base-content">Notifications</h1>
          <p className="text-base-content/70 mt-2">Stay updated with system and submission activities</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="badge badge-lg badge-error text-white font-bold">{unreadCount} Unread</span>
          )}
        </div>
      </div>

      {/* Stats Cards at Top */}
      {notifications.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-base-100 shadow-sm border border-base-300 rounded-2xl">
            <div className="card-body">
              <p className="text-base-content/70 text-sm font-semibold">Total</p>
              <p className="text-3xl font-bold text-violet-600">{notifications.length}</p>
              <p className="text-xs text-base-content/60 mt-2">All notifications</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm border border-base-300 rounded-2xl">
            <div className="card-body">
              <p className="text-base-content/70 text-sm font-semibold">Unread</p>
              <p className="text-3xl font-bold text-red-600">{unreadCount}</p>
              <p className="text-xs text-base-content/60 mt-2">Require attention</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm border border-base-300 rounded-2xl">
            <div className="card-body">
              <p className="text-base-content/70 text-sm font-semibold">Read</p>
              <p className="text-3xl font-bold text-green-600">{readCount}</p>
              <p className="text-xs text-base-content/60 mt-2">Already viewed</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm border border-base-300 rounded-2xl">
            <div className="card-body">
              <p className="text-base-content/70 text-sm font-semibold">Displayed</p>
              <p className="text-3xl font-bold text-blue-600">{filteredNotifications.length}</p>
              <p className="text-xs text-base-content/60 mt-2">Current view</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="card bg-base-100 shadow-sm border border-base-300 rounded-2xl">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="form-control w-full lg:w-64">
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input input-bordered w-full bg-base-100 rounded-lg"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3 w-full lg:w-auto">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="select select-bordered select-sm bg-base-100 rounded-lg flex-1 lg:flex-none"
              >
                <option value="all">All Types</option>
                <option value="SUBMISSION_RECEIVED">Submission Received</option>
                <option value="APPROVED">Approved</option>
                <option value="DENIED">Denied</option>
                <option value="REVISION_REQUESTED">Revision Requested</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="select select-bordered select-sm bg-base-100 rounded-lg flex-1 lg:flex-none"
              >
                <option value="all">All Status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="btn btn-sm btn-outline btn-primary rounded-lg"
                >
                  Mark All Read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="btn btn-sm btn-outline btn-error rounded-lg"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`card shadow-sm border-l-4 rounded-2xl transition-all overflow-hidden ${
                !notif.is_read
                    ? 'bg-base-200 border-l-primary'
                    : 'bg-base-100 border-l-base-300 hover:border-l-base-content/40'
              }`}
            >
              <div className="card-body p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Left Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className={`font-bold text-base ${!notif.is_read ? 'text-base-content' : 'text-base-content/85'}`}>
                        {notif.title}
                      </h3>
                      <span className={`badge badge-sm ${getBadgeColor(notif.type)} whitespace-nowrap`}>
                        {getTypeLabel(notif.type)}
                      </span>
                      {!notif.is_read && (
                        <span className="badge badge-sm badge-error text-white whitespace-nowrap">New</span>
                      )}
                    </div>
                    <p className={`text-sm mt-2 leading-relaxed ${!notif.is_read ? 'text-base-content/80' : 'text-base-content/70'}`}>
                      {notif.body}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <p className="text-xs text-base-content/60">{formatTimestamp(notif.created_at)}</p>
                      {notif.link_submission_id && (
                        <span className="text-xs text-violet-600">• View Submission</span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex gap-1 shrink-0">
                    {!notif.is_read ? (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        title="Mark as read"
                        className="btn btn-ghost btn-sm px-3 text-violet-600 hover:bg-violet-100 rounded-lg"
                      >
                        ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => markAsUnread(notif.id)}
                        title="Mark as unread"
                        className="btn btn-ghost btn-sm px-3 text-base-content/50 hover:bg-base-200 rounded-lg"
                      >
                        ◯
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      title="Delete"
                      className="btn btn-ghost btn-sm px-3 text-red-600 hover:bg-red-100 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card bg-base-100 shadow-sm border border-base-300 rounded-2xl">
            <div className="card-body flex flex-col items-center justify-center py-12">
              <svg className="w-16 h-16 text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-base-content/70 font-medium text-lg">No notifications</p>
              <p className="text-base-content/50 text-sm mt-1">You're all caught up!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
