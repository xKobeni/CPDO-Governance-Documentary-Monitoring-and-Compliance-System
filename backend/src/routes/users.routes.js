import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { audit } from "../middlewares/audit.js";
import {
  createUserHandler, listUsersHandler, setUserActiveHandler, getUserHandler
} from "../controllers/users.controller.js";

const r = Router();

r.use(requireAuth, requireRole("ADMIN"));

r.post("/", audit("CREATE_USER", "USER"), createUserHandler);
r.get("/", listUsersHandler);
r.get("/:id", getUserHandler);
r.patch("/:id/active", audit("SET_USER_ACTIVE", "USER", (req) => req.params.id, (req) => req.body), setUserActiveHandler);

export default r;