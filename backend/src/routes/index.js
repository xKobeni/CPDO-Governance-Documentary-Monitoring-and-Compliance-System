import { Router } from "express";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import templatesRoutes from "./templates.routes.js";
import submissionsRoutes from "./submissions.routes.js";
import filesRoutes from "./files.routes.js";
import reportsRoutes from "./reports.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/templates", templatesRoutes);
router.use("/submissions", submissionsRoutes);
router.use("/files", filesRoutes);
router.use("/reports", reportsRoutes);

export default router;