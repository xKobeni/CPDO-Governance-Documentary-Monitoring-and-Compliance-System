import rateLimit from "express-rate-limit";

const baseLimiterConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
};

export const apiGlobalLimiter = rateLimit({
  ...baseLimiterConfig,
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300, // 300 requests per window per IP
});

export const loginLimiter = rateLimit({
  ...baseLimiterConfig,
  windowMs: 10 * 60 * 1000, // 10 min
  max: 10,                 // 10 attempts per window per IP
});

export const forgotPasswordLimiter = rateLimit({
  ...baseLimiterConfig,
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,                  // 5 requests per window per IP
});

export const submissionCreateLimiter = rateLimit({
  ...baseLimiterConfig,
  windowMs: 10 * 60 * 1000, // 10 min
  max: 30, // protect from submission spam
});

export const submissionReviewLimiter = rateLimit({
  ...baseLimiterConfig,
  windowMs: 10 * 60 * 1000, // 10 min
  max: 60, // reviews are staff/admin actions
});

export const commentCreateLimiter = rateLimit({
  ...baseLimiterConfig,
  windowMs: 5 * 60 * 1000, // 5 min
  max: 30,
});

export const commentDeleteLimiter = rateLimit({
  ...baseLimiterConfig,
  windowMs: 5 * 60 * 1000, // 5 min
  max: 20,
});

export const fileUploadLimiter = rateLimit({
  ...baseLimiterConfig,
  windowMs: 10 * 60 * 1000, // 10 min
  max: 20,
});