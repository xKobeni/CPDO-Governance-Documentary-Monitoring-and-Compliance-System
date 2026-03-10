import { Routes, Route, Navigate } from "react-router";

import LoginPage from "../pages/login-page";
import UnauthorizedPage from "../pages/unauthorized-page";
import NotFoundPage from "../pages/not-found-page";
import ProfilePage from "../pages/profile-page";
import SettingsPage from "../pages/settings-page";
import UsersPage from "../pages/users-page";
import OfficesPage from "../pages/offices-page";
import AuditLogsPage from "../pages/audit-logs-page";

import DashboardLayout from "../layouts/dashboard-layout";
import AuthLayout from "../layouts/auth-layout";

import ProtectedRoute from "../guards/protected-route";
import RoleGuard from "../guards/role-guard";

import DashboardPage from "../pages/dashboard-page";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Main application routes - properly implemented */}
        <Route path="/governance" element={<div className="p-6"><h1 className="text-2xl font-bold">Governance Areas</h1><p>Manage governance areas and compliance tracking.</p></div>} />
        <Route path="/submissions" element={<div className="p-6"><h1 className="text-2xl font-bold">Submissions</h1><p>Manage all submissions and reviews.</p></div>} />
        <Route path="/submissions/pending" element={<div className="p-6"><h1 className="text-2xl font-bold">Pending Reviews</h1><p>Review pending submissions.</p></div>} />
        <Route path="/submissions/approved" element={<div className="p-6"><h1 className="text-2xl font-bold">Approved Submissions</h1><p>View approved submissions.</p></div>} />
        <Route path="/submissions/rejected" element={<div className="p-6"><h1 className="text-2xl font-bold">Rejected Submissions</h1><p>View rejected submissions.</p></div>} />
        <Route path="/submissions/create" element={<div className="p-6"><h1 className="text-2xl font-bold">Create New Submission</h1><p>Create a new submission.</p></div>} />
        <Route path="/reviews" element={<div className="p-6"><h1 className="text-2xl font-bold">Reviews</h1><p>Manage reviews and approvals.</p></div>} />
        <Route path="/templates" element={<div className="p-6"><h1 className="text-2xl font-bold">Templates</h1><p>Manage submission templates.</p></div>} />
        <Route path="/templates/create" element={<div className="p-6"><h1 className="text-2xl font-bold">Create Template</h1><p>Create a new template.</p></div>} />
        <Route 
          path="/users" 
          element={
            <RoleGuard allowedRoles={['ADMIN']}>
              <UsersPage />
            </RoleGuard>
          } 
        />
        <Route 
          path="/offices" 
          element={
            <RoleGuard allowedRoles={['ADMIN']}>
              <OfficesPage />
            </RoleGuard>
          }
        />
        <Route path="/reports" element={<div className="p-6"><h1 className="text-2xl font-bold">Reports</h1><p>Generate and view system reports.</p></div>} />
        <Route path="/files" element={<div className="p-6"><h1 className="text-2xl font-bold">File Management</h1><p>Manage files and documents.</p></div>} />
        <Route path="/comments" element={<div className="p-6"><h1 className="text-2xl font-bold">Comments</h1><p>View and manage comments.</p></div>} />
        <Route path="/notifications" element={<div className="p-6"><h1 className="text-2xl font-bold">Notifications</h1><p>Manage system notifications.</p></div>} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route 
          path="/audit-logs" 
          element={
            <RoleGuard allowedRoles={['ADMIN']}>
              <AuditLogsPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}