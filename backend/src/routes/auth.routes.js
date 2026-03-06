import { Router } from "express";
import { loginLimiter } from "../middlewares/rateLimit.js";
import { login, refresh, logout, me, updateMe } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const router = Router();

router.post("/login", loginLimiter, asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));
router.get("/me", requireAuth, asyncHandler(me));
router.patch("/me", requireAuth, asyncHandler(updateMe));

export default router;