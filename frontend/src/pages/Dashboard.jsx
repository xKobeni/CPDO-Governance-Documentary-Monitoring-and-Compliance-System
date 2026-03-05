export default function Dashboard() {
  const stats = [
    {
      title: 'Total Submissions',
      value: '124',
      change: '+12%',
      trend: 'up',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'violet'
    },
    {
      title: 'Pending Reviews',
      value: '18',
      change: '-5%',
      trend: 'down',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'orange'
    },
    {
      title: 'Approved',
      value: '89',
      change: '+8%',
      trend: 'up',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'green'
    },
    {
      title: 'Active Users',
      value: '42',
      change: '+3%',
      trend: 'up',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'blue'
    }
  ];

  const recentSubmissions = [
    { id: 1, title: 'Financial Transparency (GA02)', office: 'Engineering Office', governance_area: 'GA02', status: 'PENDING', submitted_at: '2024-03-05T10:30:00Z' },
    { id: 2, title: 'Full Disclosure (GA01)', office: 'Planning Division', governance_area: 'GA01', status: 'APPROVED', submitted_at: '2024-03-04T14:20:00Z' },
    { id: 3, title: 'Procurement Process (GA03)', office: 'Environmental Office', governance_area: 'GA03', status: 'REVISION_REQUESTED', submitted_at: '2024-03-03T09:15:00Z' },
    { id: 4, title: 'Administrative Capacity (GA04)', office: 'Urban Planning', governance_area: 'GA04', status: 'PENDING', submitted_at: '2024-03-02T16:45:00Z' },
    { id: 5, title: 'Records Management (GA05)', office: 'Zoning Division', governance_area: 'GA05', status: 'APPROVED', submitted_at: '2024-03-01T11:00:00Z' },
    { id: 6, title: 'Citizen Participation (GA08)', office: 'Public Affairs Office', governance_area: 'GA08', status: 'DENIED', submitted_at: '2024-02-28T13:30:00Z' }
  ];

  const getColorClasses = (color) => {
    const colors = {
      violet: 'bg-violet-100 text-violet-600',
      orange: 'bg-orange-100 text-orange-600',
      green: 'bg-green-100 text-green-600',
      blue: 'bg-blue-100 text-blue-600'
    };
    return colors[color] || colors.violet;
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: 'badge-warning',
      APPROVED: 'badge-success',
      DENIED: 'badge-error',
      REVISION_REQUESTED: 'badge-info'
    };
    return badges[status] || 'badge-ghost';
  };

  const getStatusText = (status) => {
    const texts = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      DENIED: 'Denied',
      REVISION_REQUESTED: 'Revision Requested'
    };
    return texts[status] || status;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card bg-white shadow-sm border border-gray-200">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                    <span className="text-xs text-gray-500">from last month</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${getColorClasses(stat.color)}`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Submissions */}
        <div className="lg:col-span-2">
          <div className="card bg-white shadow-sm border border-gray-200">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title text-gray-800">Recent Submissions</h2>
                <a href="#all-submissions" className="text-sm text-violet-600 hover:text-violet-700 font-medium">
                  View All
                </a>
              </div>
              
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="text-gray-700">Governance Area</th>
                      <th className="text-gray-700">Office</th>
                      <th className="text-gray-700">Status</th>
                      <th className="text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubmissions.map((submission) => (
                      <tr key={submission.id} className="hover">
                        <td className="font-medium text-gray-800">{submission.title}</td>
                        <td className="text-gray-600">{submission.office}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(submission.status)} badge-sm`}>
                            {getStatusText(submission.status)}
                          </span>
                        </td>
                        <td className="text-gray-600">{formatDate(submission.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="card bg-white shadow-sm border border-gray-200">
            <div className="card-body">
              <h2 className="card-title text-gray-800 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button className="btn btn-outline border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white hover:border-violet-600 w-full justify-start">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Submission
                </button>
                <button className="btn btn-outline border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white hover:border-violet-600 w-full justify-start">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Create Template
                </button>
                <button className="btn btn-outline border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white hover:border-violet-600 w-full justify-start">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Report
                </button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="card bg-white shadow-sm border border-gray-200">
            <div className="card-body">
              <h2 className="card-title text-gray-800 mb-4">Notifications</h2>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-violet-600 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm text-gray-800 font-medium">New submission received</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm text-gray-800 font-medium">Document approved</p>
                    <p className="text-xs text-gray-500">1 hour ago</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-orange-600 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm text-gray-800 font-medium">Review pending</p>
                    <p className="text-xs text-gray-500">3 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
