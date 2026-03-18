import { Routes, Route, Navigate } from "react-router";

import LoginPage from "../pages/login-page";
import ForgotPasswordPage from "../pages/forgot-password-page";
import UnauthorizedPage from "../pages/unauthorized-page";
import NotFoundPage from "../pages/not-found-page";
import ProfilePage from "../pages/profile-page";
import SettingsPage from "../pages/settings-page";
import UsersPage from "../pages/users-page";
import OfficesPage from "../pages/offices-page";
import AuditLogsPage from "../pages/audit-logs-page";
import ReportsPage from "../pages/reports-page";
import GovernancePage from "../pages/governance-page";
import GovernanceCompliancePage from "../pages/governance-compliance-page";
import TemplatesAllPage from "../pages/templates-all-page";
import SubmissionsPage from "../pages/submissions-page";
import TemplatesManagePage from "../pages/templates-manage-page";
import TemplatesCategoriesPage from "../pages/templates-categories-page";
import YearsPage from "../pages/years-page";

import DashboardLayout from "../layouts/dashboard-layout";
import AuthLayout from "../layouts/auth-layout";

import ProtectedRoute from "../guards/protected-route";
import RoleGuard from "../guards/role-guard";

import DashboardPage from "../pages/dashboard-page";
import MyChecklistsPage from "../pages/my-checklists-page";
import NotificationsPage from "../pages/notifications-page";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
        <Route path="/governance" element={<Navigate to="/dashboard" replace />} />
        <Route path="/governance/manage" element={<RoleGuard allowedRoles={['ADMIN']}><GovernancePage /></RoleGuard>} />
        <Route path="/governance/compliance" element={<GovernanceCompliancePage />} />
        <Route path="/my-checklists" element={<RoleGuard allowedRoles={['OFFICE']}><MyChecklistsPage /></RoleGuard>} />
        <Route path="/submissions" element={<SubmissionsPage />} />
        <Route path="/reviews" element={<div className="p-6"><h1 className="text-2xl font-bold">Reviews</h1><p>Manage reviews and approvals.</p></div>} />
        <Route path="/templates" element={<TemplatesAllPage />} />
        <Route path="/templates/manage" element={<RoleGuard allowedRoles={['ADMIN']}><TemplatesManagePage /></RoleGuard>} />
        <Route path="/templates/categories" element={<RoleGuard allowedRoles={['ADMIN']}><TemplatesCategoriesPage /></RoleGuard>} />
        <Route
          path="/years"
          element={
            <RoleGuard allowedRoles={['ADMIN']}>
              <YearsPage />
            </RoleGuard>
          }
        />
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
        <Route
          path="/reports"
          element={
            <RoleGuard allowedRoles={['ADMIN', 'STAFF']}>
              <ReportsPage />
            </RoleGuard>
          }
        />
        <Route path="/files" element={<div className="p-6"><h1 className="text-2xl font-bold">File Management</h1><p>Manage files and documents.</p></div>} />
        <Route path="/comments" element={<div className="p-6"><h1 className="text-2xl font-bold">Comments</h1><p>View and manage comments.</p></div>} />
        <Route path="/notifications" element={<NotificationsPage />} />
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