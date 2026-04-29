# CPDO Monitoring System Developer Guide

This guide helps future developers set up, run, and contribute to the CPDO Monitoring System quickly.

## 1) Project Structure

- `backend/` - Express API, PostgreSQL models, authentication, reporting, and scripts.
- `frontend/` - React + Vite client application.
- `backend/src/db/schema.sql` - Main database schema and constraints.

Related backend references:
- `backend/SYSTEM_FLOW.md` - End-to-end backend request and business flow.
- `backend/SECURITY_FEATURES.md` - Security controls currently implemented.

## 2) Folder and File Navigation

Use this as a quick map when you need to find where to implement changes.

### Backend navigation (`backend/src/`)

- `config/` - environment parsing, DB pool, logger setup.
- `routes/` - endpoint grouping and route registration.
- `controllers/` - request handling and response formatting.
- `models/` - SQL/data-access layer.
- `middlewares/` - auth, RBAC, rate limits, error handlers.
- `services/` - business services (email templates, verification, exports, etc.).
- `db/schema.sql` - database tables, indexes, constraints.
- `scripts/` - utility scripts (`apply-schema.js`, `seed.js`).

### Frontend navigation (`frontend/src/`)

- `pages/` - route-level screens (dashboard, reports, settings, auth pages).
- `api/` - API wrappers grouped by domain.
- `lib/axios.js` - base Axios client, token/session handling, refresh flow.
- `store/` - client-side auth and other shared state.
- `components/` - reusable UI components.

### "Where do I edit?" quick guide

- Login/auth flow: `backend/src/routes/auth.routes.js`, `backend/src/controllers/auth.controller.js`, `frontend/src/api/auth.js`.
- Reports: `backend/src/routes/reports.routes.js`, `backend/src/controllers/reports.controller.js`, `frontend/src/api/reports.js`, `frontend/src/pages/reports-page.jsx`.
- User management: `backend/src/routes/users.routes.js`, `backend/src/controllers/users.controller.js`.
- Forgot/reset password: `backend/src/controllers/auth.controller.js`, `frontend/src/pages/forgot-password-page.jsx`.
- DB changes: `backend/src/db/schema.sql`, then run `npm run db:schema`.

## 3) Prerequisites

- Node.js 20+ (recommended).
- npm 10+.
- PostgreSQL 14+.
- A configured `.env` file for backend and frontend.

## 4) Initial Setup

From the project root:

```powershell
cd backend
npm install

cd ../frontend
npm install
```

## 5) Environment Configuration

### Backend `.env` (inside `backend/`)

Minimum required variables:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/cpdo_monitoring
CORS_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=replace-with-long-random-secret
JWT_REFRESH_SECRET=replace-with-long-random-secret
```

Common optional variables:

```env
PORT=5000
NODE_ENV=development
DATABASE_SSL=false
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
INACTIVITY_TIMEOUT_MINUTES=30
UPLOAD_QUOTA_BYTES=262144000
COOKIE_SECURE=false
FRONTEND_URL=http://localhost:5173
PUBLIC_API_URL=http://localhost:5000
```

Email (SMTP) variables if mail features are enabled:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-user
SMTP_PASS=your-pass
MAIL_FROM="CPDO Monitoring <noreply@example.com>"
```

### Frontend `.env` (inside `frontend/`)

```env
VITE_API_URL=http://localhost:5000/api
```

## 6) Database Setup

Apply schema:

```powershell
cd backend
npm run db:schema
```

Seed admin account (optional but recommended in development):

```powershell
cd backend
npm run seed
```

Optional seed overrides:

```env
SEED_ADMIN_EMAIL=cpdc.systems@gmail.com
SEED_ADMIN_PASSWORD=Admin@12345
SEED_ADMIN_NAME=CPDO System Admin
```

## 7) Running the App Locally

Start backend:

```powershell
cd backend
npm run dev
```

Start frontend in another terminal:

```powershell
cd frontend
npm run dev
```

Default local URLs:
- API health check: `http://localhost:5000/health`
- Frontend: `http://localhost:5173`

## 8) Development Workflow

### Backend conventions

- Routes are mounted in `backend/src/routes/index.js` under `/api/*`.
- Keep route files thin; place request logic in controllers and data access in models.
- Use parameterized SQL only (`$1`, `$2`, ...) to prevent SQL injection.
- Respect RBAC and office-level scoping for protected resources.

### Frontend conventions

- API functions live under `frontend/src/api/`.
- Shared Axios instance and auth token/refresh logic are in `frontend/src/lib/axios.js`.
- Keep page-level orchestration in `frontend/src/pages/`, reusable UI in component folders.

### Typical feature flow

1. Add/adjust DB schema when needed (`schema.sql`).
2. Update backend model + controller + route.
3. Expose client API function in `frontend/src/api/`.
4. Integrate into page/component and verify role-specific behavior.

## 9) Security Checklist for Changes

Before merging, verify:

- Auth-protected endpoints use `requireAuth`.
- Role-restricted endpoints use role checks.
- Input validation is applied (Zod or equivalent).
- New mutating endpoints respect rate limiting where needed.
- Sensitive errors are not leaked in API responses.

See `backend/SECURITY_FEATURES.md` for implemented protections.

## 10) Useful Commands

Backend:

```powershell
cd backend
npm run dev
npm run start
npm run db:schema
npm run seed
```

Frontend:

```powershell
cd frontend
npm run dev
npm run build
npm run lint
npm run preview
```

## 11) Troubleshooting

- `Missing env var` on backend startup:
  - Confirm required backend env variables are present and correctly named.
- CORS or cookie issues during auth:
  - Ensure `CORS_ORIGIN`, `FRONTEND_URL`, `VITE_API_URL`, and protocol/port are aligned.
- Refresh/auth not working:
  - Check browser cookie settings and that backend is reachable at the same URL configured in frontend env.
- Database connection errors:
  - Verify `DATABASE_URL`, DB credentials, DB host reachability, and SSL mode.
- Email verification/reset emails not sent:
  - Check SMTP vars and backend logs; backend can still run with email disabled.

## 12) Suggested Onboarding Order

1. Read `backend/SYSTEM_FLOW.md`.
2. Read `backend/SECURITY_FEATURES.md`.
3. Run backend + frontend locally.
4. Apply schema and seed admin.
5. Trace one real feature end-to-end (route -> controller -> model -> frontend API -> page).

