import { Routes, Route, Navigate } from "react-router";

import LoginPage from "../pages/login-page";
import UnauthorizedPage from "../pages/unauthorized-page";
import NotFoundPage from "../pages/not-found-page";
import ProfilePage from "../pages/profile-page";

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

        {/* Placeholder routes for future features */}
        <Route path="/governance" element={<div className="p-6"><h1 className="text-2xl font-bold">Governance</h1><p>Coming soon...</p></div>} />
        <Route path="/submissions" element={<div className="p-6"><h1 className="text-2xl font-bold">Submissions</h1><p>Coming soon...</p></div>} />
        <Route path="/reviews" element={<div className="p-6"><h1 className="text-2xl font-bold">Reviews</h1><p>Coming soon...</p></div>} />
        <Route path="/templates" element={<div className="p-6"><h1 className="text-2xl font-bold">Templates</h1><p>Coming soon...</p></div>} />
        <Route path="/users" element={<div className="p-6"><h1 className="text-2xl font-bold">Users</h1><p>Coming soon...</p></div>} />
        <Route path="/offices" element={<div className="p-6"><h1 className="text-2xl font-bold">Offices</h1><p>Coming soon...</p></div>} />
        <Route path="/reports" element={<div className="p-6"><h1 className="text-2xl font-bold">Reports</h1><p>Coming soon...</p></div>} />
        <Route path="/audit-logs" element={<div className="p-6"><h1 className="text-2xl font-bold">Audit Logs</h1><p>Coming soon...</p></div>} />
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}