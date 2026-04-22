import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { audit } from "../middlewares/audit.js";
import { mediumCache } from "../middlewares/caching.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  createUserHandler,
  listUsersHandler,
  setUserActiveHandler,
  getUserHandler,
  updateUserHandler,
  deleteUserHandler,
  resetUserPasswordHandler,
  resendUserVerificationHandler,
} from "../controllers/users.controller.js";

const r = Router();

r.use(requireAuth, checkSessionInactivity, requireRole("ADMIN"));

r.post(
  "/",
  audit(
    "CREATE_USER",
    "USER",
    null,
    (req) => ({ email: req.body.email, fullName: req.body.fullName, role: req.body.role })
  ),
  asyncHandler(createUserHandler)
);
r.get("/", mediumCache, asyncHandler(listUsersHandler));
r.get("/:id", mediumCache, asyncHandler(getUserHandler));
r.patch(
  "/:id",
  audit("UPDATE_USER", "USER", (req) => req.params.id, (req) => req.body),
  asyncHandler(updateUserHandler)
);
r.patch(
  "/:id/active",
  audit("SET_USER_ACTIVE", "USER", (req) => req.params.id, (req) => req.body),
  asyncHandler(setUserActiveHandler)
);
r.post(
  "/:id/reset-password",
  audit("RESET_PASSWORD", "USER", (req) => req.params.id),
  asyncHandler(resetUserPasswordHandler)
);
r.post(
  "/:id/resend-verification",
  audit("RESEND_EMAIL_VERIFICATION", "USER", (req) => req.params.id),
  asyncHandler(resendUserVerificationHandler)
);
r.delete(
  "/:id",
  audit("DELETE_USER", "USER", (req) => req.params.id),
  asyncHandler(deleteUserHandler)
);

export default r;