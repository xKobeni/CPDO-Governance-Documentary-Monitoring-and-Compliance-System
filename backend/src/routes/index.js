import { Router } from "express";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import officesRoutes from "./offices.routes.js";
import governanceRoutes from "./governance.routes.js";
import templatesRoutes from "./templates.routes.js";
import submissionsRoutes from "./submissions.routes.js";
import filesRoutes from "./files.routes.js";
import notificationsRoutes from "./notifications.routes.js";
import reportsRoutes from "./reports.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import auditRoutes from "./audit.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/offices", officesRoutes);
router.use("/governance-areas", governanceRoutes);
router.use("/templates", templatesRoutes);
router.use("/submissions", submissionsRoutes);
router.use("/files", filesRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/reports", reportsRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/audit-logs", auditRoutes);

export default router;