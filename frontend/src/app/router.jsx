import { Routes, Route, Navigate } from "react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const LoginPage               = lazy(() => import("../pages/login-page"));
const ForgotPasswordPage      = lazy(() => import("../pages/forgot-password-page"));
const UnauthorizedPage        = lazy(() => import("../pages/unauthorized-page"));
const NotFoundPage            = lazy(() => import("../pages/not-found-page"));
const ProfilePage             = lazy(() => import("../pages/profile-page"));
const SettingsPage            = lazy(() => import("../pages/settings-page"));
const UsersPage               = lazy(() => import("../pages/users-page"));
const OfficesPage             = lazy(() => import("../pages/offices-page"));
const AuditLogsPage           = lazy(() => import("../pages/audit-logs-page"));
const ReportsPage             = lazy(() => import("../pages/reports-page"));
const GovernancePage          = lazy(() => import("../pages/governance-page"));
const GovernanceCompliancePage = lazy(() => import("../pages/governance-compliance-page"));
const TemplatesAllPage        = lazy(() => import("../pages/templates-all-page"));
const SubmissionsPage         = lazy(() => import("../pages/submissions-page"));
const TemplatesManagePage     = lazy(() => import("../pages/templates-manage-page"));
const TemplatesCategoriesPage = lazy(() => import("../pages/templates-categories-page"));
const YearsPage               = lazy(() => import("../pages/years-page"));
const DashboardPage           = lazy(() => import("../pages/dashboard-page"));
const MyChecklistsPage        = lazy(() => import("../pages/my-checklists-page"));
const NotificationsPage       = lazy(() => import("../pages/notifications-page"));
const FileManagerPage         = lazy(() => import("../pages/file-manager-page"));

import DashboardLayout from "../layouts/dashboard-layout";
import AuthLayout from "../layouts/auth-layout";

import ProtectedRoute from "../guards/protected-route";
import RoleGuard from "../guards/role-guard";

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="/governance/compliance" element={<RoleGuard allowedRoles={['ADMIN']}><GovernanceCompliancePage /></RoleGuard>} />
        <Route path="/my-checklists" element={<RoleGuard allowedRoles={['OFFICE']}><MyChecklistsPage /></RoleGuard>} />
        <Route path="/submissions" element={<SubmissionsPage />} />
        <Route path="/reviews" element={<div className="p-6"><h1 className="text-2xl font-bold">Reviews</h1><p>Manage reviews and approvals.</p></div>} />
        <Route path="/templates" element={<RoleGuard allowedRoles={['ADMIN']}><TemplatesAllPage /></RoleGuard>} />
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
            <RoleGuard allowedRoles={['ADMIN', 'STAFF']}>
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
        <Route 
          path="/file-manager" 
          element={
            <RoleGuard allowedRoles={['ADMIN', 'STAFF']}>
              <FileManagerPage />
            </RoleGuard>
          } 
        />
        <Route path="/comments" element={<div className="p-6"><h1 className="text-2xl font-bold">Comments</h1><p>View and manage comments.</p></div>} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route 
          path="/audit-logs" 
          element={
            <RoleGuard allowedRoles={['ADMIN', 'STAFF', 'OFFICE']}>
              <AuditLogsPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}