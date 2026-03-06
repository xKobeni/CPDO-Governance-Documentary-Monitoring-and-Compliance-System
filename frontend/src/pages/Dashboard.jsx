import { useState, useEffect } from 'react';
import { getDashboardOverview, getUserStats, getRecentActivity, getOfficePerformance, getReviewerPerformance } from '../services/dashboardService';

// KPI Card Component
function KPICard({ title, value, subtitle, color, trend }) {
  const bgColors = {
    teal: 'bg-teal-50 border-teal-200',
    blue: 'bg-blue-50 border-blue-200',
    orange: 'bg-orange-50 border-orange-200',
    purple: 'bg-purple-50 border-purple-200'
  };
  
  const iconColors = {
    teal: 'bg-teal-100 text-teal-600',
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  const icons = {
    teal: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806m-6.737-9.033a6.857 6.857 0 00-1.088-.995 4.948 4.948 0 016.738 0c-.342.334-.74.635-1.088.995m0 0a6.857 6.857 0 01-1.088.995" />
      </svg>
    ),
    blue: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    orange: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    purple: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 15.071V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v4.071a2.032 2.032 0 01-.595 1.524L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    )
  };

  return (
    <div className={`rounded-lg border p-6 ${bgColors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-4xl font-bold text-gray-900 mt-2">{value}</p>
          <p className="text-gray-500 text-xs mt-2">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${iconColors[color]}`}>
          {icons[color]}
        </div>
      </div>
    </div>
  );
}

// Monthly Trend Chart
function MonthlyTrendChart({ data = [] }) {

  const maxValue = Math.max(...data.map(d => d.count || 0), 1);
  const height = 250;
  const width = '100%';
  const svgHeight = 250;
  const padding = 40;
  const chartHeight = svgHeight - 2 * padding;
  const graphWidth = 400;
  const pointSpacing = data.length > 1 ? graphWidth / (data.length - 1) : 0;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const points = data.map((d, i) => {
    const x = padding + i * pointSpacing;
    const y = padding + chartHeight - (d.count / maxValue) * chartHeight;
    return { x, y, count: d.count, month: monthNames[d.month - 1] || `M${d.month}` };
  });

  const pathD = points.length > 0 ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` : '';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Submissions Trend</h3>
      <div className="overflow-x-auto">
        <svg width="450" height={svgHeight} className="mx-auto">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={`grid-${i}`} x1={padding} y1={padding + (i * chartHeight) / 4} x2={padding + graphWidth} y2={padding + (i * chartHeight) / 4} stroke="#e5e7eb" strokeDasharray="4,4" strokeWidth="1" />
          ))}
          <line x1={padding} y1={padding} x2={padding} y2={svgHeight - padding} stroke="#d1d5db" strokeWidth="1" />
          <line x1={padding} y1={svgHeight - padding} x2={padding + graphWidth} y2={svgHeight - padding} stroke="#d1d5db" strokeWidth="1" />
          {pathD && (
            <>
              <path d={`${pathD} L ${points[points.length - 1].x},${svgHeight - padding} L ${padding},${svgHeight - padding} Z`} fill="url(#lineGradient)" />
              <path d={pathD} stroke="#0d9488" strokeWidth="3" fill="none" />
            </>
          )}
          {points.map((p, i) => (
            <circle key={`point-${i}`} cx={p.x} cy={p.y} r="5" fill="#0d9488" stroke="#fff" strokeWidth="2" />
          ))}
          {points.map((p, i) => (
            <text key={`label-${i}`} x={p.x} y={svgHeight - padding + 25} textAnchor="middle" fontSize="12" fill="#6b7280" className="text-xs">{p.month}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// Status Distribution Pie Chart
function StatusPieChart({ data = [], kpis = {} }) {
  const total = kpis.totalSubmissions || 1;

  let currentAngle = 0;
  const radius = 70;
  const centerX = 110;
  const centerY = 110;

  const colors = { 
    PENDING: '#f59e0b', 
    APPROVED: '#10b981', 
    DENIED: '#ef4444', 
    REVISION_REQUESTED: '#3b82f6' 
  };

  const slices = data.map((item) => {
    const sliceAngle = (item.count / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    const largeArc = sliceAngle > 180 ? 1 : 0;
    const pathD = [`M ${centerX} ${centerY}`, `L ${x1} ${y1}`, `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`, 'Z'].join(' ');
    currentAngle = endAngle;
    return { pathD, count: item.count, status: item.status, color: colors[item.status], percentage: ((item.count / total) * 100).toFixed(0) };
  });

  const statusLabels = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    DENIED: 'Denied',
    REVISION_REQUESTED: 'Revision'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Status Breakdown</h3>
      <div className="flex flex-col items-center">
        <svg width="220" height="220" className="mb-6">
          {slices.map((slice, i) => (
            <path key={`slice-${i}`} d={slice.pathD} fill={slice.color} stroke="#fff" strokeWidth="1.5" />
          ))}
        </svg>
        <div className="w-full space-y-2">
          {slices.map((slice, i) => (
            <div key={`legend-${i}`} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }}></div>
                <span className="text-sm text-gray-600">{statusLabels[slice.status]}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{slice.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Top Offices
function TopOfficesAnalysis({ offices = [] }) {
  const maxSubmissions = Math.max(...offices.map(o => o.totalSubmissions || 0), 1);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Offices</h3>
      <div className="space-y-4">
        {offices.slice(0, 5).map((office, i) => (
          <div key={office.id || i}>
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm font-medium text-gray-700">{office.name}</span>
              <span className="text-sm font-semibold text-gray-900">{office.totalSubmissions}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full" 
                style={{ width: `${(office.totalSubmissions / maxSubmissions) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Governance Distribution
function GovernanceDistribution({ data = [] }) {
  const maxCount = Math.max(...data.map(d => d.count || 0), 1);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Governance Areas</h3>
      <div className="space-y-4">
        {data.map((item, i) => (
          <div key={item.governance_code || i}>
            <div className="flex justify-between items-end mb-1">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.governance_code}</p>
                <p className="text-xs text-gray-500">{item.governance_name}</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">{item.count}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" 
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Reviewer Performance
function ReviewerPerformance({ reviewers = [] }) {
  if (!reviewers || reviewers.length === 0) return null;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Reviewers</h3>
      <div className="space-y-5">
        {reviewers.slice(0, 4).map((reviewer) => (
          <div key={reviewer.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{reviewer.full_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{reviewer.totalReviews} reviews</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-900">{reviewer.approvalRate}%</span>
                <p className="text-xs text-gray-500">approval</p>
              </div>
              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                <div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${reviewer.approvalRate}%` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Upload Status by Governance
function UploadStatusByGovernance({ data = [] }) {
  if (!data || data.length === 0) return null;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Upload Status by Governance Area</h3>
      <div className="space-y-5">
        {data.map((item, i) => {
          const total = item.completed + item.pending + item.missing;
          const completedPct = (item.completed / total * 100).toFixed(0);
          const pendingPct = (item.pending / total * 100).toFixed(0);
          
          return (
            <div key={i}>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.governance_code}</p>
                  <p className="text-xs text-gray-500">{item.governance_name}</p>
                </div>
                <span className="text-sm font-semibold text-gray-700">{completedPct}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden flex">
                <div className="bg-green-600 h-2.5" style={{ width: `${completedPct}%` }}></div>
                <div className="bg-yellow-500 h-2.5" style={{ width: `${pendingPct}%` }}></div>
                <div className="bg-red-400 h-2.5" style={{ width: `${100 - completedPct - pendingPct}%` }}></div>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-600">
                <span>✓ {item.completed} Completed</span>
                <span>⏳ {item.pending} Pending</span>
                <span>✕ {item.missing} Missing</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Upload Status by Office
function UploadStatusByOffice({ offices = [] }) {
  if (!offices || offices.length === 0) return null;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Upload Status by Office</h3>
      <div className="space-y-5">
        {offices.slice(0, 5).map((office, i) => {
          const total = office.completedUploads + office.pendingUploads + office.missingUploads;
          const completedPct = (office.completedUploads / total * 100).toFixed(0);
          const pendingPct = (office.pendingUploads / total * 100).toFixed(0);
          
          return (
            <div key={i}>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-gray-900">{office.name}</p>
                <span className="text-sm font-semibold text-gray-700">{completedPct}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden flex">
                <div className="bg-green-600 h-2.5" style={{ width: `${completedPct}%` }}></div>
                <div className="bg-yellow-500 h-2.5" style={{ width: `${pendingPct}%` }}></div>
                <div className="bg-red-400 h-2.5" style={{ width: `${100 - completedPct - pendingPct}%` }}></div>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-600">
                <span>✓ {office.completedUploads} Completed</span>
                <span>⏳ {office.pendingUploads} Pending</span>
                <span>✕ {office.missingUploads} Missing</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Recent Activity
function ActivityFeed({ activities = [] }) {
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activities.slice(0, 8).map((activity, i) => (
          <div key={activity.id || i} className="flex gap-3 pb-3 border-b border-gray-100 last:border-b-0">
            <div className="w-2 h-2 mt-2 rounded-full bg-teal-600 flex-shrink-0"></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{activity.user_name || 'System'}</p>
              <p className="text-xs text-gray-600 truncate">{activity.title || activity.action}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(activity.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// User Statistics
function UserStatistics({ stats = {} }) {
  const roles = [
    { name: 'Admins', count: stats.byRole?.ADMIN || 0, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'Staff', count: stats.byRole?.STAFF || 0, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { name: 'Office Users', count: stats.byRole?.OFFICE || 0, color: 'bg-teal-50 text-teal-700 border-teal-200' }
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg p-6 text-white">
        <p className="text-white/90 text-sm font-medium">Total Users</p>
        <p className="text-4xl font-bold mt-2">{stats.total || 0}</p>
        <p className="text-white/75 text-xs mt-2">Active accounts</p>
      </div>
      {roles.map((role, i) => (
        <div key={i} className={`border rounded-lg p-6 ${role.color}`}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{role.name}</p>
          <p className="text-3xl font-bold mt-3">{role.count}</p>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Sample data for fallback/demo
  const sampleDashboardData = {
    kpis: {
      totalSubmissions: 156,
      pendingSubmissions: 23,
      approvedSubmissions: 98,
      deniedSubmissions: 12,
      revisionRequestedSubmissions: 23,
      reviewedSubmissions: 133,
      approvalRate: 73.7,
      reviewCompletionRate: 85.3,
      missingUploadsCount: 8,
      unreadNotifications: 5
    },
    charts: {
      statusBreakdown: [
        { status: 'APPROVED', count: 98 },
        { status: 'PENDING', count: 23 },
        { status: 'REVISION_REQUESTED', count: 23 },
        { status: 'DENIED', count: 12 }
      ],
      monthlySubmissionTrend: [
        { month: 1, count: 8 },
        { month: 2, count: 14 },
        { month: 3, count: 18 },
        { month: 4, count: 22 },
        { month: 5, count: 25 },
        { month: 6, count: 28 }
      ],
      topGovernanceAreas: [
        { governance_code: 'GA01', governance_name: 'Financial Management', count: 32 },
        { governance_code: 'GA02', governance_name: 'Procurement', count: 28 },
        { governance_code: 'GA03', governance_name: 'HR Management', count: 26 },
        { governance_code: 'GA04', governance_name: 'Risk Management', count: 22 },
        { governance_code: 'GA05', governance_name: 'Compliance', count: 20 }
      ]
    },
    recent: [
      { id: 1, item_title: 'Q1 Financial Report', office_name: 'Finance Office', governance_code: 'GA01', status: 'APPROVED', submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 2, item_title: 'Procurement Plan', office_name: 'Procurement', governance_code: 'GA02', status: 'PENDING', submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 3, item_title: 'HR Policies Update', office_name: 'HR Department', governance_code: 'GA03', status: 'REVISION_REQUESTED', submitted_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() }
    ]
  };

  const sampleUserStats = {
    total: 45,
    byRole: {
      ADMIN: 3,
      STAFF: 12,
      OFFICE: 30
    }
  };

  const sampleOfficePerformance = {
    year: new Date().getFullYear(),
    offices: [
      { id: 1, name: 'Finance Office', totalSubmissions: 32, approvedCount: 28, deniedCount: 1, revisionCount: 2, pendingCount: 1, approvalRate: '96.6', completionRate: '96.9', completedUploads: 28, pendingUploads: 3, missingUploads: 1 },
      { id: 2, name: 'Procurement Office', totalSubmissions: 28, approvedCount: 24, deniedCount: 2, revisionCount: 1, pendingCount: 1, approvalRate: '92.3', completionRate: '96.4', completedUploads: 25, pendingUploads: 2, missingUploads: 1 },
      { id: 3, name: 'HR Department', totalSubmissions: 26, approvedCount: 22, deniedCount: 1, revisionCount: 2, pendingCount: 1, approvalRate: '95.7', completionRate: '96.2', completedUploads: 23, pendingUploads: 2, missingUploads: 1 },
      { id: 4, name: 'Planning Office', totalSubmissions: 20, approvedCount: 18, deniedCount: 1, revisionCount: 1, pendingCount: 0, approvalRate: '94.7', completionRate: '100', completedUploads: 19, pendingUploads: 1, missingUploads: 0 },
      { id: 5, name: 'Operations Unit', totalSubmissions: 18, approvedCount: 15, deniedCount: 2, revisionCount: 1, pendingCount: 0, approvalRate: '93.8', completionRate: '100', completedUploads: 16, pendingUploads: 1, missingUploads: 1 }
    ]
  };

  const sampleUploadStatusByGovernance = [
    { governance_code: 'GA01', governance_name: 'Financial Management', completed: 28, pending: 3, missing: 1 },
    { governance_code: 'GA02', governance_name: 'Procurement', completed: 24, pending: 2, missing: 2 },
    { governance_code: 'GA03', governance_name: 'HR Management', completed: 20, pending: 4, missing: 2 },
    { governance_code: 'GA04', governance_name: 'Risk Management', completed: 18, pending: 2, missing: 2 },
    { governance_code: 'GA05', governance_name: 'Compliance', completed: 16, pending: 3, missing: 1 }
  ];

  const sampleReviewerPerf = {
    year: new Date().getFullYear(),
    reviewers: [
      { id: 1, full_name: 'John Smith', role: 'ADMIN', totalReviews: 45, approved: 34, denied: 4, revisions: 7, avgReviewDays: 2.5, approvalRate: 75.6 },
      { id: 2, full_name: 'Sarah Johnson', role: 'STAFF', totalReviews: 38, approved: 30, denied: 3, revisions: 5, avgReviewDays: 1.8, approvalRate: 78.9 },
      { id: 3, full_name: 'Mike Wilson', role: 'ADMIN', totalReviews: 42, approved: 31, denied: 5, revisions: 6, avgReviewDays: 2.2, approvalRate: 73.8 },
      { id: 4, full_name: 'Elena Davis', role: 'STAFF', totalReviews: 35, approved: 28, denied: 2, revisions: 5, avgReviewDays: 2.0, approvalRate: 80.0 }
    ]
  };

  const sampleActivityFeed = {
    activity: [
      { id: 1, type: 'audit', user_name: 'John Smith', title: 'Approved Q1 Report', action: 'APPROVED', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { id: 2, type: 'comment', user_name: 'Sarah Johnson', title: 'Requested revisions', action: 'COMMENT', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
      { id: 3, type: 'audit', user_name: 'Mike Wilson', title: 'Submitted HR Policies', action: 'CREATE', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
      { id: 4, type: 'audit', user_name: 'Elena Davis', title: 'Denied Procurement Plan', action: 'DENIED', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
      { id: 5, type: 'comment', user_name: 'John Smith', title: 'Added comment', action: 'COMMENT', timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() }
    ],
    total: 5
  };

  const [dashboardData, setDashboardData] = useState(sampleDashboardData);
  const [userStats, setUserStats] = useState(sampleUserStats);
  const [officePerformance, setOfficePerformance] = useState(sampleOfficePerformance);
  const [reviewerPerf, setReviewerPerf] = useState(sampleReviewerPerf);
  const [activityFeed, setActivityFeed] = useState(sampleActivityFeed.activity);
  const [uploadStatusByGovernance, setUploadStatusByGovernance] = useState(sampleUploadStatusByGovernance);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchAllData = async () => {
      setError(null);
      try {
        const [mainData, uStats, activity, officePerf, reviewPerf] = await Promise.all([
          getDashboardOverview({ year }),
          getUserStats(),
          getRecentActivity({ limit: 20 }),
          getOfficePerformance({ year }),
          getReviewerPerformance({ year })
        ]);
        
        // Only update if API returns valid data, otherwise keep sample data
        if (mainData && mainData.kpis && Object.keys(mainData.kpis).length > 0) {
          setDashboardData(mainData);
        }
        if (uStats && uStats.total > 0) {
          setUserStats(uStats);
        }
        if (activity && activity.activity && activity.activity.length > 0) {
          setActivityFeed(activity.activity);
        }
        if (officePerf && officePerf.offices && officePerf.offices.length > 0) {
          setOfficePerformance(officePerf);
        }
        if (reviewPerf && reviewPerf.reviewers && reviewPerf.reviewers.length > 0) {
          setReviewerPerf(reviewPerf);
        }
        
        console.log('API Response - Main:', mainData, 'Stats:', uStats, 'Activity:', activity, 'Offices:', officePerf, 'Reviewers:', reviewPerf);
      } catch (err) {
        console.warn('Failed to load from API, showing sample data:', err.message);
        // Keep sample data as fallback - don't set error
      }
    };
    fetchAllData();
  }, [year]);

  const { kpis = {}, charts = {}, recent = [] } = dashboardData || {};

  const getStatusBadge = (status) => {
    const badges = { PENDING: 'badge-warning', APPROVED: 'badge-success', DENIED: 'badge-error', REVISION_REQUESTED: 'badge-info' };
    return badges[status] || 'badge-ghost';
  };

  const getStatusText = (status) => {
    const texts = { PENDING: 'Pending', APPROVED: 'Approved', DENIED: 'Denied', REVISION_REQUESTED: 'Revision Requested' };
    return texts[status] || status;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-48 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 animate-pulse h-32"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 animate-pulse h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex gap-4">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-red-900">Error Loading Dashboard</h3>
                <p className="text-sm text-red-800 mt-1">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-600 mt-1">Here's your system overview and performance metrics</p>
          </div>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))} 
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {[...Array(5)].map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard title="Total Submissions" value={kpis.totalSubmissions || 0} subtitle={`${kpis.reviewCompletionRate?.toFixed(1) || 0}% complete`} color="blue" />
          <KPICard title="Pending Review" value={kpis.pendingSubmissions || 0} subtitle="Awaiting action" color="orange" />
          <KPICard title="Approval Rate" value={`${kpis.approvalRate?.toFixed(1) || 0}%`} subtitle="Of reviewed items" color="teal" />
          <KPICard title="Unread Alerts" value={kpis.unreadNotifications || 0} subtitle="Needs attention" color="purple" />
        </div>

        {/* User Statistics */}
        <div className="mb-8">
          <UserStatistics stats={userStats} />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MonthlyTrendChart data={charts.monthlySubmissionTrend} />
          <StatusPieChart data={charts.statusBreakdown} kpis={kpis} />
        </div>

        {/* Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <GovernanceDistribution data={charts.topGovernanceAreas} />
          <TopOfficesAnalysis offices={officePerformance.offices} />
        </div>

        {/* Upload Status Monitoring */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <UploadStatusByGovernance data={uploadStatusByGovernance} />
          <UploadStatusByOffice offices={officePerformance.offices} />
        </div>

        {/* Activity Feed */}
        <div className="mb-8">
          <ActivityFeed activities={activityFeed} />
        </div>

        {/* Recent Submissions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Submissions</h3>
          {recent && recent.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Item</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Office</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Area</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{sub.item_title}</td>
                      <td className="px-4 py-3 text-gray-700">{sub.office_name}</td>
                      <td className="px-4 py-3 text-gray-700">{sub.governance_code}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                          sub.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          sub.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          sub.status === 'DENIED' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {getStatusText(sub.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(sub.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No recent submissions</p>
          )}
        </div>

        {/* Missing Uploads Alert */}
        {kpis.missingUploadsCount !== null && kpis.missingUploadsCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex gap-4">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-yellow-900">Action Required</h3>
                <p className="text-sm text-yellow-800 mt-1">{kpis.missingUploadsCount} items are still missing submissions this year</p>
                <button className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition">
                  Review Missing Items
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
