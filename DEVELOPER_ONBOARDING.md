# SGLG Monitoring System

*City Planning and Development Office (CPDO)*

## Developer Onboarding Guide

**Audience:** Developers contributing to frontend/backend  
**Last Updated:** May 5, 2026

---

## 1. Objective

This guide helps new and existing developers quickly understand, run, and extend the SGLG Monitoring System (CPDO) codebase with consistent conventions.

---

## 2. Project Structure

### 2.1 Monorepo Layout

- `backend/` - Node/Express API
- `frontend/` - React/Vite SPA
- `DEVELOPER_GUIDE.md` - additional project notes

### 2.2 Backend Internal Pattern

- `config/` - env/db/logger/storage setup
- `routes/` - endpoint registration
- `controllers/` - request/response handlers
- `models/` - SQL query and persistence operations
- `middlewares/` - auth, rate limit, audit, validation, errors
- `services/` - email and cross-model business services
- `utils/` - token/hash/password/csrf helpers
- `db/schema.sql` - canonical database schema
- `scripts/` - schema and seed scripts

### 2.3 Frontend Internal Pattern

- `app/` - providers, router, query client
- `pages/` - route-level UI
- `components/` - reusable presentational components
- `api/` - backend API wrappers
- `guards/` - route and role protections
- `hooks/` - reusable behavior/state hooks
- `store/` - auth state store
- `lib/` - axios instance, utils, nav config

---

## 3. Local Setup

## 3.1 Backend

1. `cd backend`
2. `npm install`
3. Configure `.env`
4. `npm run db:schema`
5. `npm run seed`
6. `npm run dev`

Backend default dev command:

- `nodemon src/server.js`

## 3.2 Frontend

1. `cd frontend`
2. `npm install`
3. Set `VITE_API_URL`
4. `npm run dev`

---

## 4. Backend Runtime and Boot

Startup entry: `backend/src/server.js`

Boot sequence:

1. create Express app (`createApp`)
2. database healthcheck
3. ensure roles exist
4. verify email transport (non-fatal if unavailable)
5. start listening on configured port

---

## 5. API Design Conventions

### 5.1 Routing

All domain routes are mounted under `/api` in `routes/index.js`.

Current route groups:

- auth
- users
- offices
- governance-areas
- templates
- submissions
- files
- notifications
- reports
- dashboard
- analytics
- audit-logs
- years

### 5.2 Controller Pattern

Controllers should:

- validate inputs (explicitly or middleware)
- delegate DB actions to models/services
- enforce role and scope rules
- return stable JSON response contracts
- avoid embedding very complex SQL when model abstraction exists

### 5.3 Error Handling

Use async-safe handler wrapper and centralized error middleware.

---

## 6. Authentication and Session Flow

### 6.1 Tokens and Headers

- Access token in `Authorization: Bearer <token>`
- Session ID in `x-session-id`
- CSRF token in `x-csrf-token` for mutating requests

### 6.2 Frontend Axios Interceptors

`frontend/src/lib/axios.js` handles:

- automatic auth header injection
- automatic session header injection
- CSRF header injection for mutation requests
- refresh attempt on 401 responses
- forced logout when session becomes invalid/inactive

### 6.3 Backend Auth Middleware

- `requireAuth` validates JWT
- `checkSessionInactivity` validates auth session activity window

---

## 7. Role-Based Access Control (RBAC)

Roles:

- `ADMIN`
- `STAFF`
- `OFFICE`

RBAC should be enforced in two layers:

1. frontend route guards (UX-level)
2. backend checks (security-level, mandatory)

Never assume frontend checks are sufficient.

---

## 8. Database and Schema Strategy

### 8.1 Source of Truth

- `backend/src/db/schema.sql` is canonical.

Schema characteristics:

- enum-based statuses/actions
- UUID primary keys
- timestamps (`created_at`, `updated_at`)
- unique constraints for domain integrity
- indexes for query efficiency
- trigger helper for `updated_at`

### 8.2 Key Domain Tables

- users / roles / offices
- governance_areas / years
- checklist_templates / checklist_items
- submissions / submission_files
- reviews / verification_checks
- notifications / audit_logs
- auth_sessions / reset + verification tokens

---

## 9. File Upload Implementation

Implementation location:

- `backend/src/middlewares/upload.js`
- `backend/src/config/b2.js`

Highlights:

- `multer-s3` storage engine
- MIME whitelist + extension consistency validation
- 25 MB max file size
- generated storage key per upload

When extending uploads:

- keep MIME and extension map aligned
- maintain server-side validation
- verify downstream consumers can parse new formats

---

## 10. Reporting Module Notes

Controller:

- `backend/src/controllers/reports.controller.js`

Supported output types include CSV, XLSX, and PDF for specific report flows.

When adding reports:

- separate data assembly logic from format rendering
- validate filter inputs (`year`, role-scoped office, governance area)
- handle empty datasets gracefully
- set correct `Content-Type` and download headers

---

## 11. Frontend Routing and Guarding

Main router:

- `frontend/src/app/router.jsx`

Guarding:

- `ProtectedRoute` for authenticated sections
- `RoleGuard` for role-specific pages

When adding new pages:

1. Create page under `src/pages`
2. Add API helpers under `src/api` if needed
3. Register route in router
4. Apply role guard as needed
5. Add navigation entry (if required)

---

## 12. Coding Standards for This Project

### Backend

- keep route files lean; business logic in controllers/services/models
- prefer explicit SQL fields (avoid ambiguous `SELECT *` in evolving endpoints)
- preserve backward-compatible response payloads for existing UI
- use centralized middleware for shared concerns

### Frontend

- keep page-level containers in `pages/`
- move reusable UI patterns to `components/`
- keep API calls in `src/api` wrappers
- prefer React Query for server-state fetching/caching
- keep role-aware conditional UI consistent with guards

---

## 13. Testing and Validation Workflow

Minimum manual validation before merging:

1. Login/logout/refresh flow
2. Role-based page access
3. Submission upload and status transitions
4. Notifications and audit logs
5. Report exports

Recommended command checks:

- backend starts without env/runtime errors
- frontend build succeeds
- frontend lint passes (when modifying frontend code)

---

## 14. Common Development Pitfalls

- mismatch between frontend `VITE_API_URL` and backend origin
- CORS + credentials misconfiguration in local/prod
- forgetting CSRF header in mutating non-axios requests
- role assumptions in frontend not backed by backend checks
- schema changes without updating seed scripts and dependent queries

---

## 15. Safe Change Process

### For New Features

1. identify target modules (route/controller/model/page/api)
2. define API contract changes
3. implement backend first
4. update frontend integration
5. validate role/access implications
6. test exports/notifications/audit impacts where relevant

### For Schema Changes

1. update `schema.sql` carefully (idempotent where possible)
2. verify apply-schema behavior on existing DB
3. update model queries and DTOs
4. validate seed script compatibility

---

## 16. Production-Grade Contribution Checklist

- [ ] feature works for intended role(s)
- [ ] no unauthorized role can access protected behavior
- [ ] no sensitive data leaked in logs or responses
- [ ] DB queries indexed and scoped
- [ ] API responses consistent with existing UI expectations
- [ ] error handling is explicit and user-safe
- [ ] docs updated (user/admin/dev as needed)

---

## 17. Onboarding Fast Track (First Day)

1. Clone repo and run backend/frontend locally.
2. Apply schema and seed data.
3. Login using seeded admin account.
4. Trace one full workflow:
   - create/update entity
   - submit file
   - review submission
   - export report
5. Read key files:
   - backend: `server.js`, `app.js`, `routes/index.js`, `controllers/auth.controller.js`
   - frontend: `app/router.jsx`, `lib/axios.js`, `store/auth-store.js`

---

## 18. Developer Access Tutorial (PostgreSQL, Render, B2)

This is a quick developer-focused access setup so you can debug end-to-end workflows.

### 18.1 PostgreSQL Access for Development

### Local or Remote DB via SQL Client

1. Open your SQL tool (DBeaver/pgAdmin/TablePlus).
2. Create PostgreSQL connection using project credentials.
3. Use SSL mode if your DB provider requires it.

Recommended first queries:

- `SELECT current_database();`
- `SELECT COUNT(*) FROM users;`
- `SELECT COUNT(*) FROM submissions;`

### Terminal Access

- `psql "postgresql://<user>:<password>@<host>:5432/<db>?sslmode=require"`

### 18.2 Render Access for Logs and Deploy Debugging

1. Log in at [https://dashboard.render.com](https://dashboard.render.com).
2. Open CPDO backend service.
3. Use:
   - **Logs** to debug runtime errors
   - **Environment** to verify env vars
   - **Events** to inspect failed/successful deploys

When debugging production issues, always compare:

- deployed env vars vs local `.env`
- deployed commit/version vs local branch

### 18.3 Backblaze B2 Access for Upload Debugging

1. Log in at [https://secure.backblaze.com](https://secure.backblaze.com).
2. Open target bucket configured in `B2_BUCKET_NAME`.
3. Verify uploaded keys and object timestamps after test upload.

If uploads fail, compare:

- `B2_ENDPOINT`
- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_NAME`

against the active backend environment.

### 18.4 Common End-to-End Debug Scenario

If user says "upload succeeded but file missing":

1. check backend logs in Render for upload middleware errors
2. verify submission file record in PostgreSQL (`submission_files`)
3. verify object exists in B2 bucket with expected key
4. verify retrieval/download endpoint uses same key

