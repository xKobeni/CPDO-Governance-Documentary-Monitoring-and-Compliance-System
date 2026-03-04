import { Router } from "express";
import { loginLimiter } from "../middlewares/rateLimit.js";
import { login, refresh, logout, me } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;