import { Router } from "express";
import { loginLimiter } from "../middlewares/rateLimit.js";
import { login, refresh, logout, me, updateMe } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { audit } from "../middlewares/audit.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const router = Router();

router.post("/login", loginLimiter, audit("LOGIN_ATTEMPT", "USER", null, (req) => ({ email: req.body.email })), asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", audit("LOGOUT", "USER", null, (req) => ({ userAgent: req.headers["user-agent"] })), asyncHandler(logout));
router.get("/me", requireAuth, asyncHandler(me));
router.patch("/me", requireAuth, audit("UPDATE_PROFILE", "USER", (req) => req.user?.sub, (req) => req.body), asyncHandler(updateMe));

export default router;