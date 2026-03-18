import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 10,                 // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,                  // 5 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
});