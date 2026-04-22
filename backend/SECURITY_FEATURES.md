# Security Features (Simple Guide)

This file explains the security protections currently implemented in this system and how they work.

## 1) HTTP Security Headers (`helmet`)
- **What it does:** Adds secure HTTP headers automatically.
- **How it acts:** Helps protect against common web attacks (for example clickjacking and unsafe content execution).

## 2) CORS Protection
- **What it does:** Only allows requests from the configured frontend origin.
- **How it acts:** Browsers block cross-origin requests that are not allowed by server policy.

## 3) Request Body Size Limit
- **What it does:** Limits JSON request body size to `1mb`.
- **How it acts:** Rejects overly large payloads to reduce abuse and memory pressure.

## 4) Global API Rate Limiting
- **What it does:** Applies a default request cap across all `/api` routes.
- **How it acts:** If an IP sends too many requests in the time window, the API returns `429 Too Many Requests`.

## 5) Stricter Per-Route Rate Limits
- **What it does:** Uses tighter limits for higher-risk actions.
- **Where used:** login, forgot-password, reset-password, create submission, review submission, create/delete comment, file upload.
- **How it acts:** Stops endpoint spam even if global traffic is within limits.

## 6) JWT Authentication + Session Validation
- **What it does:** Requires valid bearer token for protected routes.
- **How it acts:** Invalid/expired token returns `401`.
- **Extra session check:** If `x-session-id` is provided, session is validated and inactive/revoked sessions are denied.

## 7) Role-Based Access Control (RBAC)
- **What it does:** Restricts routes by role (`ADMIN`, `STAFF`, `OFFICE`).
- **How it acts:** Unauthorized role gets `403 Forbidden`.

## 8) CSRF Protection for Cookie Auth Flows
- **What it does:** Uses a CSRF token cookie and matching `x-csrf-token` header.
- **Where enforced:** Auth routes that use refresh cookie (`/auth/refresh`, `/auth/logout`).
- **How it acts:** Missing or mismatched token returns `403 CSRF check failed`.

## 9) Secure Refresh Cookie Handling
- **What it does:** Stores refresh token in `httpOnly` cookie with `sameSite=strict`.
- **How it acts:** Browser sends cookie securely to auth routes; JavaScript cannot read the refresh token.

## 10) Login Abuse Protection (Lockout)
- **What it does:** Tracks failed login attempts per user.
- **How it acts:** After repeated failures, account is temporarily locked and login is denied until lock expires.

## 11) Password Reset Hardening
- **What it does:** Forgot-password response is generic and does not expose reset token.
- **How it acts:** Prevents account enumeration and prevents token leakage through API responses.
- **Email delivery:** Reset codes are sent via SMTP email (Nodemailer) instead of being returned by API in normal environments.
- **Dev fallback:** If SMTP is disabled in non-production, the reset code can be returned only for local testing.

## 12) SQL Injection Protection
- **What it does:** Uses parameterized SQL queries (`$1`, `$2`, etc.).
- **How it acts:** User input is treated as data, not executable SQL.
- **Recent fix:** Notification cleanup query now uses parameterized interval math instead of string interpolation.

## 13) File Upload Restrictions
- **What it does:** Restricts upload types and enforces max file size (25MB).
- **How it acts:** Invalid type/extension or oversized file is rejected.

## 14) Safe Error Responses
- **What it does:** In production, internal stack traces are hidden from API responses.
- **How it acts:** Reduces accidental leakage of internal system details.

---

## Notes
- These controls provide a solid baseline for application-level security.
- For stronger protection against large traffic attacks, edge protection (WAF/CDN/reverse proxy controls) should also be added.
