import { Router } from "express";
import { loginLimiter, forgotPasswordLimiter, verifyEmailLimiter } from "../middlewares/rateLimit.js";
import {
  login,
  refresh,
  logout,
  me,
  updateMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "../controllers/auth.controller.js";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { requireCsrf } from "../utils/csrf.js";
import { audit } from "../middlewares/audit.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const router = Router();

router.post("/login", loginLimiter, audit("LOGIN_ATTEMPT", "USER", null, (req) => ({ email: req.body.email })), asyncHandler(login));
router.get("/verify-email", verifyEmailLimiter, asyncHandler(verifyEmail));
router.post("/forgot-password", forgotPasswordLimiter, asyncHandler(forgotPassword));
router.post("/reset-password", forgotPasswordLimiter, asyncHandler(resetPassword));
router.post("/resend-verification", forgotPasswordLimiter, asyncHandler(resendVerification));
router.post("/refresh", requireCsrf, asyncHandler(refresh));
router.post("/logout", requireCsrf, audit("LOGOUT", "USER", null, (req) => ({ userAgent: req.headers["user-agent"] })), asyncHandler(logout));
router.get("/me", requireAuth, checkSessionInactivity, asyncHandler(me));
router.patch("/me", requireAuth, checkSessionInactivity, audit("UPDATE_PROFILE", "USER", (req) => req.user?.sub, (req) => req.body), asyncHandler(updateMe));

export default router;