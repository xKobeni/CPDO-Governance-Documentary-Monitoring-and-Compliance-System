# SGLG Monitoring System

*City Planning and Development Office (CPDO)*

## System Administrator Manual

**Audience:** IT administrators, deployment engineers, system maintainers  
**Last Updated:** May 5, 2026

---

## 1. Scope

This manual covers installation, configuration, deployment, operations, maintenance, security, and troubleshooting for the **SGLG Monitoring System** operated by CPDO.

---

## 2. System Architecture

### 2.1 Components

- **Frontend:** React + Vite SPA
- **Backend API:** Node.js + Express
- **Database:** PostgreSQL
- **Object Storage:** Backblaze B2 via S3-compatible API
- **Email Service:** SMTP (Nodemailer)

### 2.2 Runtime Flow

1. Frontend sends API requests to backend (`VITE_API_URL`).
2. Backend validates auth/session and enforces RBAC.
3. Backend reads/writes PostgreSQL records.
4. File uploads are stored in B2 bucket.
5. Exports are generated in API responses (CSV/XLSX/PDF).

---

## 3. Infrastructure Prerequisites

### 3.1 Required Software

- Node.js LTS
- npm
- PostgreSQL server
- Network access for frontend-to-backend and backend-to-DB
- B2 bucket access for file storage

### 3.2 Optional/Recommended

- Reverse proxy (Nginx or equivalent)
- Process manager (PM2/systemd/container orchestrator)
- TLS termination for HTTPS
- Centralized log collection

---

## 4. Backend Configuration

Configured in `backend/src/config/env.js`.

### 4.1 Required Variables

- `DATABASE_URL`
- `CORS_ORIGIN`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

### 4.2 Common Variables

- `NODE_ENV`
- `PORT`
- `DATABASE_SSL`
- `ACCESS_TOKEN_TTL`
- `REFRESH_TOKEN_TTL_DAYS`
- `INACTIVITY_TIMEOUT_MINUTES`
- `COOKIE_SECURE`
- `COOKIE_DOMAIN`
- `FRONTEND_URL`
- `PUBLIC_API_URL`

### 4.3 SMTP Variables

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

### 4.4 Backblaze B2 Variables

- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_NAME`
- `B2_ENDPOINT`

---

## 5. Frontend Configuration

Primary variable:

- `VITE_API_URL` (must point to backend `/api` host)

Ensure value matches backend CORS/cookie policy and deployment domain.

---

## 6. Database Provisioning

### 6.1 Schema Application

From `backend` directory:

- `npm run db:schema`

This executes `backend/src/scripts/apply-schema.js`, which loads SQL from `backend/src/db/schema.sql`.

### 6.2 Seed Data

From `backend` directory:

- `npm run seed`

Seed behavior includes:

- required roles (`ADMIN`, `STAFF`, `OFFICE`)
- admin user (default values unless overridden by env)
- optional demo offices/users

For production, override defaults and disable demo seed users as needed.

---

## 7. Deployment Procedure

## 7.1 Backend Deployment

1. Install dependencies:
   - `npm install`
2. Configure production env variables.
3. Run schema migration/apply script.
4. Run seed script (if needed).
5. Start API:
   - `npm start` (or process manager equivalent)

### 7.2 Frontend Deployment

1. Install dependencies:
   - `npm install`
2. Set `VITE_API_URL`.
3. Build:
   - `npm run build`
4. Deploy static output to web host/CDN.

### 7.3 Post-Deployment Smoke Test

- `/health` returns `{ ok: true }`
- login works
- protected routes enforce authentication
- role restrictions behave correctly
- upload and report exports work

---

## 8. Security Operations

### 8.1 Authentication and Sessions

- Access token: Bearer JWT
- Refresh flow: cookie + CSRF validation
- Session tracking uses `auth_sessions` with inactivity timeout

### 8.2 Hardening Checklist

- enable HTTPS in production
- set `COOKIE_SECURE=true` in production
- set strict CORS origin to approved frontend domain
- rotate JWT secrets and SMTP/storage credentials periodically
- monitor repeated failed login attempts

### 8.3 Authorization

RBAC is enforced via backend middleware and frontend guards. Never rely on frontend-only route protection.

---

## 9. File Storage Operations

### 9.1 Upload Controls

- max upload size: 25 MB
- MIME + extension validation enforced
- uploads stored with generated storage keys

### 9.2 B2 Operational Checks

- verify endpoint and region compatibility
- validate key access to target bucket
- monitor storage usage and lifecycle retention

---

## 10. Monitoring and Logging

### 10.1 Application Logs

- request logs via `morgan`
- structured logs via `pino` / `pino-http`

### 10.2 Audit Logs

Critical business actions are stored in database `audit_logs`.

Recommended monitoring:

- unexpected admin actions
- repetitive auth failures
- suspicious file activity

---

## 11. Backup and Recovery

### 11.1 Backup Plan

- daily PostgreSQL backups
- periodic backup verification (restore tests)
- backup retention policy aligned to compliance requirements

### 11.2 Storage Recovery Considerations

- maintain versioning/retention strategy in B2
- ensure storage credentials are recoverable securely

### 11.3 Recovery Validation

After restore:

- validate critical tables and indexes
- validate role/user accessibility
- test upload, review, and reporting workflows

---

## 12. Operations Runbook

### Daily

- check API uptime
- scan error logs
- review unread notifications volume anomalies

### Weekly

- review audit activity for risky actions
- validate disk/storage growth
- validate DB health and slow queries

### Monthly

- rotate service secrets (policy-based)
- test backup restore in non-production
- review inactive/expired sessions and token tables

---

## 13. Troubleshooting

### 13.1 Backend Startup Failure

**Checks**

- missing required env vars
- invalid `DATABASE_URL`
- DB SSL mismatch (`DATABASE_SSL`)

### 13.2 401/Session Expiration Loops

**Checks**

- refresh endpoint reachable
- CSRF header present
- cookie domain/secure settings correct
- session inactivity timeout too strict

### 13.3 CORS Failures

**Checks**

- `CORS_ORIGIN` must match frontend origin exactly
- credentials mode enabled in frontend axios
- proxy rules preserving headers/cookies

### 13.4 Upload Errors

**Checks**

- MIME/extension mismatch
- file > 25MB
- B2 credential/bucket/endpoint issues

### 13.5 Report Export Errors

**Checks**

- data exists for selected filters
- role has permission to access export
- server logs for controller-level exceptions

---

## 14. Change Management Guidance

- Test changes in staging first.
- Snapshot database before major schema or auth changes.
- Track infra and env changes in deployment notes.
- Validate role matrix and security controls after each release.

---

## 15. Production Readiness Checklist

- [ ] Required env vars set and documented
- [ ] HTTPS and secure cookie settings enabled
- [ ] DB schema applied and seed validated
- [ ] Upload storage configured and tested
- [ ] SMTP verified (if email features enabled)
- [ ] Backup + restore process tested
- [ ] Monitoring/alerts enabled
- [ ] Admin credentials secured and rotated

---

## 16. Access Tutorials: PostgreSQL, Render, Backblaze B2

This section is a practical walkthrough for accessing your core managed services.

### 16.1 How to Access PostgreSQL

### A. From Local Machine (GUI - pgAdmin, DBeaver, TablePlus)

1. Open your SQL client.
2. Create a new PostgreSQL connection.
3. Use values from your secure environment/config:
   - **Host**
   - **Port** (usually `5432`)
   - **Database name**
   - **Username**
   - **Password**
   - **SSL mode** (required for managed DB providers)
4. Test connection and save.

### B. From Terminal (psql)

Use:

- `psql "postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require"`

After connection:

- `\dt` to list tables
- `SELECT now();` for quick query check

### C. Verify CPDO Schema Is Present

Run:

- `SELECT COUNT(*) FROM roles;`
- `SELECT COUNT(*) FROM users;`
- `SELECT COUNT(*) FROM governance_areas;`

If these fail with relation errors, schema may not be applied yet.

### D. Security Notes

- never commit DB credentials to Git
- use read-only DB users for reporting tools where possible
- rotate DB credentials periodically

### 16.2 How to Access Render

### A. Open Dashboard

1. Go to [https://dashboard.render.com](https://dashboard.render.com).
2. Sign in with your team/project account.
3. Open the correct workspace/project.

### B. Open Your Service

1. Select backend service for CPDO API.
2. Review tabs:
   - **Events** (deploy history)
   - **Logs** (runtime/app logs)
   - **Environment** (env vars)
   - **Settings** (plan, region, build/start command)

### C. Validate Backend Configuration

Confirm these are correctly set in Render Environment:

- `DATABASE_URL`
- `CORS_ORIGIN`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- B2 variables
- SMTP variables (if email enabled)

### D. Redeploy / Restart

- Use **Manual Deploy** after env updates.
- Use restart if app is stuck but config is unchanged.

### E. Verify Health

After deployment, test:

- `<your-backend-url>/health`

Expected response:

- `{ "ok": true }`

### F. Render Best Practices

- keep production and staging services separate
- do not edit secrets directly in public/shared screens
- review logs immediately after each deploy

### 16.3 How to Access Backblaze B2 ("Blitz")

If by "blitz" you mean Backblaze B2, use this flow.

### A. Open B2 Console

1. Go to [https://secure.backblaze.com](https://secure.backblaze.com).
2. Log in to your B2 account.
3. Open **Buckets** and select your CPDO bucket.

### B. Check Bucket and Files

- verify expected upload prefixes (for example `uploads/`)
- check recent objects after test upload from app
- verify object metadata and file sizes

### C. Access Keys (Application Keys)

1. Open **App Keys**.
2. Validate key used in backend env:
   - key ID (`B2_KEY_ID`)
   - application key (`B2_APPLICATION_KEY`)
3. Ensure key has correct bucket permissions.

### D. Endpoint/Region Validation

In backend config, ensure:

- `B2_ENDPOINT` matches your bucket region endpoint
- bucket name matches `B2_BUCKET_NAME`

### E. Operational Safety

- do not expose B2 keys in frontend code
- rotate keys when staff changes or on potential compromise
- use lifecycle rules to control storage growth

### 16.4 Quick Connectivity Test Matrix

After setup, verify:

- **PostgreSQL:** backend can run startup healthcheck
- **Render:** backend deploy completes and `/health` is reachable
- **B2:** upload succeeds from submissions page and object appears in bucket

