# SGLG Monitoring System (CPDO) — Database Setup Guide

This guide covers everything from creating a PostgreSQL database to running the schema and seeding data for local development.

---

## 1) Prerequisites

- **PostgreSQL 14+** installed and running
- **Node.js 20+** and **npm 10+**
- `psql` CLI (optional, for manual verification)

---

## 2) Creating the Database

You need a PostgreSQL database named `cpdo_monitoring` (or whatever `DATABASE_URL` points to).

### Option A — Using `psql`

```powershell
psql -U postgres
```

Then inside the psql prompt:

```sql
CREATE DATABASE cpdo_monitoring;
\q
```

### Option B — Using pgAdmin

1. Open pgAdmin and connect to your PostgreSQL server.
2. Right-click **Databases** → **Create** → **Database**.
3. Set name to `cpdo_monitoring`, leave defaults, click **Save**.

### Option C — Using DBeaver / TablePlus

Create a new PostgreSQL connection with your credentials, then create the database via the GUI or SQL editor.

---

## 3) Environment Configuration

Copy the example env file and configure the database connection:

```powershell
cd backend
cp .env.example .env
```

Edit `backend/.env` and set `DATABASE_URL`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/cpdo_monitoring
```

| Part | Meaning |
|------|---------|
| `postgres` | database username |
| `password` | database password |
| `localhost` | host (use remote IP for cloud DBs) |
| `5432` | default PostgreSQL port |
| `cpdo_monitoring` | database name |

For cloud databases that require SSL, append `?sslmode=require`:

```env
DATABASE_URL=postgresql://user:pass@host:5432/cpdo_monitoring?sslmode=require
```

---

## 4) Applying the Schema

The canonical schema lives at `backend/src/db/schema.sql`. It defines all tables, enums, indexes, triggers, and constraints.

Run:

```powershell
cd backend
npm run db:schema
```

This executes `node src/scripts/apply-schema.js`, which reads `src/db/schema.sql` and runs it against the database.

### What the schema creates (16 tables)

- `roles` — ADMIN, STAFF, OFFICE
- `offices` — government offices
- `users` — user accounts with Argon2 password hashes
- `governance_areas` — compliance categories (GA01–GA10)
- `years` — managed reporting years
- `checklist_templates` — one template per governance area per year
- `checklist_items` — individual checklist entries (supports parent/child)
- `submissions` — office submissions for checklist items
- `submission_files` — versioned file uploads
- `reviews` — staff/admin review decisions
- `verification_checks` — per-review verification flags
- `submission_comments` — two-way comments on submissions
- `notifications` — in-app notifications
- `audit_logs` — action audit trail
- `report_exports` — export request records
- `office_governance_assignments` — which governance areas apply to which offices per year
- `auth_sessions` — refresh token sessions with rotation
- `password_reset_tokens` — forgot-password flow
- `email_verification_tokens` — email verification flow

### Idempotent design

The schema uses `IF NOT EXISTS`, `CREATE OR REPLACE`, and safe `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` patterns throughout. **You can safely re-run `npm run db:schema`** on an existing database — it will only add missing objects and skip existing ones.

This is the project's migration strategy: make changes to `schema.sql` and re-run it.

---

## 5) Seeding the Database

After the schema is applied, seed the database with the admin account and optional demo data:

```powershell
cd backend
npm run seed
```

This executes `node src/scripts/seed.js`.

### Seed configuration (via environment variables)

Set these in `backend/.env` before running `npm run seed`:

```env
SEED_ADMIN_EMAIL=cpdc.systems@gmail.com
SEED_ADMIN_PASSWORD=Admin@12345
SEED_ADMIN_NAME=CPDO System Admin
SEED_DEMO_USERS=false
SEED_DEMO_PASSWORD=Demo@12345
```

| Variable | Default | Description |
|----------|---------|-------------|
| `SEED_ADMIN_EMAIL` | `cpdc.systems@gmail.com` | Admin login email |
| `SEED_ADMIN_PASSWORD` | `Admin@12345` | Admin password |
| `SEED_ADMIN_NAME` | `CPDO System Admin` | Admin display name |
| `SEED_DEMO_USERS` | `false` | Set to `true` to create sample offices and users |
| `SEED_DEMO_PASSWORD` | `Demo@12345` | Password for demo accounts |

The seed script is also idempotent — it uses `ON CONFLICT DO NOTHING` and upsert logic. Re-running it updates the admin account and adds any missing demo data without duplicating existing records.

---

## 6) Verifying the Setup

### Health check

Start the backend:

```powershell
cd backend
npm run dev
```

Visit `http://localhost:5000/health` — should return `{ "ok": true }`.

### Manual verification via psql

```powershell
psql -U postgres -d cpdo_monitoring
```

```sql
SELECT current_database();
SELECT COUNT(*) FROM users;
SELECT code, name FROM roles;
SELECT COUNT(*) FROM governance_areas;
```

Expected: admin user exists, 3 roles exist, governance areas are populated (if seeded).

---

## 7) Connecting with SQL Clients

### DBeaver / pgAdmin / TablePlus

Create a new connection with:

| Field | Value |
|-------|-------|
| Host | `localhost` (or remote host) |
| Port | `5432` |
| Database | `cpdo_monitoring` |
| Username | `postgres` (or your DB user) |
| Password | your DB password |
| SSL | enable if required by your provider |

### psql command-line

```powershell
psql "postgresql://user:password@host:5432/cpdo_monitoring?sslmode=require"
```

---

## 8) Upgrading / Schema Changes

1. Edit `backend/src/db/schema.sql` with your changes.
2. Use `IF NOT EXISTS` for new tables/columns/enums.
3. Run `npm run db:schema` to apply.
4. Update `src/scripts/seed.js` if seed data needs to change.
5. Run `npm run seed` to update seed data.

There is no separate migration framework — the schema file itself is the source of truth and is designed to be safely reapplied.

---

## 9) Resetting for Development

Drop and recreate the database:

```powershell
psql -U postgres
```

```sql
DROP DATABASE IF EXISTS cpdo_monitoring;
CREATE DATABASE cpdo_monitoring;
\q
```

Then re-run schema and seed:

```powershell
cd backend
npm run db:schema
npm run seed
```

---

## 10) Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `ECONNREFUSED` on startup | PostgreSQL not running | Start the PostgreSQL service |
| `password authentication failed` | Wrong credentials in `DATABASE_URL` | Double-check username and password |
| `database "cpdo_monitoring" does not exist` | Database not created | Run `CREATE DATABASE cpdo_monitoring;` |
| `relation "users" does not exist` | Schema not applied | Run `npm run db:schema` |
| `no pg_hba.conf entry` | PostgreSQL not configured for local password auth | Check `pg_hba.conf` and restart service |
| SSL errors with cloud DB | `sslmode` missing from URL | Append `?sslmode=require` to `DATABASE_URL` |
| Schema errors on re-run | Unsupported `ALTER TYPE ADD VALUE` inside transaction | The schema uses `BEGIN; ... COMMIT;` — this is handled by wrapping in a DO block |
