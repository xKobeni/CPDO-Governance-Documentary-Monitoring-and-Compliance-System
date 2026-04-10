BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- =========================
-- ENUMS
-- =========================
DO $$ BEGIN
  CREATE TYPE template_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'REVISION_REQUESTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_action AS ENUM ('APPROVE', 'DENY', 'REQUEST_REVISION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE frequency_type AS ENUM ('ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY', 'ONE_TIME');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('SUBMISSION_RECEIVED', 'APPROVED', 'DENIED', 'REVISION_REQUESTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend notification_type safely (idempotent-ish) for UI/feature growth.
-- Older databases created before these values existed can be upgraded by re-running schema.sql.
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'DEADLINE_REMINDER';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SYSTEM';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NEW_COMMENT';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'FILE_REPLACED';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE export_format AS ENUM ('PDF', 'XLSX', 'CSV');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================
-- UPDATED_AT trigger helper
-- =========================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- ROLES
-- =========================
CREATE TABLE IF NOT EXISTS roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_roles_code CHECK (code IN ('ADMIN', 'STAFF', 'OFFICE'))
);

-- =========================
-- OFFICES
-- =========================
CREATE TABLE IF NOT EXISTS offices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  contact_email TEXT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_offices_updated_at ON offices;
CREATE TRIGGER trg_offices_updated_at
BEFORE UPDATE ON offices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  full_name             TEXT NOT NULL,
  role_id               UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  office_id             UUID NULL REFERENCES offices(id) ON DELETE SET NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at         TIMESTAMPTZ NULL,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  last_failed_attempt   TIMESTAMPTZ NULL,
  account_locked_until  TIMESTAMPTZ NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_office_id ON users(office_id);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- GOVERNANCE AREAS
-- =========================
CREATE TABLE IF NOT EXISTS governance_areas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,     -- GA01..GA10
  name        TEXT NOT NULL,
  description TEXT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_governance_areas_sort ON governance_areas(sort_order);

DROP TRIGGER IF EXISTS trg_governance_areas_updated_at ON governance_areas;
CREATE TRIGGER trg_governance_areas_updated_at
BEFORE UPDATE ON governance_areas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- YEARS (managed list of reporting years)
-- =========================
CREATE TABLE IF NOT EXISTS years (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year       INT UNIQUE NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_years_range CHECK (year >= 2000 AND year <= 2100)
);

DROP TRIGGER IF EXISTS trg_years_updated_at ON years;
CREATE TRIGGER trg_years_updated_at
BEFORE UPDATE ON years
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- CHECKLIST TEMPLATES (1 per governance per year)
-- =========================
CREATE TABLE IF NOT EXISTS checklist_templates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  governance_area_id  UUID NOT NULL REFERENCES governance_areas(id) ON DELETE RESTRICT,
  year               INT NOT NULL,
  title              TEXT NOT NULL,
  notes              TEXT NULL,
  status             template_status NOT NULL DEFAULT 'ACTIVE',
  created_by         UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_template_governance_year UNIQUE (governance_area_id, year)
);

CREATE INDEX IF NOT EXISTS idx_templates_year ON checklist_templates(year);
CREATE INDEX IF NOT EXISTS idx_templates_gov_year ON checklist_templates(governance_area_id, year);

DROP TRIGGER IF EXISTS trg_checklist_templates_updated_at ON checklist_templates;
CREATE TRIGGER trg_checklist_templates_updated_at
BEFORE UPDATE ON checklist_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- CHECKLIST ITEMS (supports parent/child)
-- =========================
CREATE TABLE IF NOT EXISTS checklist_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id         UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  parent_item_id      UUID NULL REFERENCES checklist_items(id) ON DELETE CASCADE,

  item_code           TEXT NOT NULL, -- 1, 1.a, 2.1, etc.
  title               TEXT NOT NULL,
  description         TEXT NULL,

  is_required         BOOLEAN NOT NULL DEFAULT TRUE,
  frequency           frequency_type NOT NULL DEFAULT 'ANNUAL',
  due_date            DATE NULL,

  allowed_file_types  TEXT[] NULL, -- e.g. {'pdf','docx'}
  max_files           INT NOT NULL DEFAULT 1,

  sort_order          INT NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_item_template_code UNIQUE (template_id, item_code)
);

CREATE INDEX IF NOT EXISTS idx_items_template_id ON checklist_items(template_id);
CREATE INDEX IF NOT EXISTS idx_items_parent_item_id ON checklist_items(parent_item_id);

DROP TRIGGER IF EXISTS trg_checklist_items_updated_at ON checklist_items;
CREATE TRIGGER trg_checklist_items_updated_at
BEFORE UPDATE ON checklist_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- SUBMISSIONS (one per office + checklist item + year)
-- =========================
CREATE TABLE IF NOT EXISTS submissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year               INT NOT NULL,
  office_id          UUID NOT NULL REFERENCES offices(id) ON DELETE RESTRICT,

  governance_area_id UUID NOT NULL REFERENCES governance_areas(id) ON DELETE RESTRICT, -- denormalized for filters
  template_id        UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE RESTRICT,
  checklist_item_id  UUID NOT NULL REFERENCES checklist_items(id) ON DELETE RESTRICT,

  status             submission_status NOT NULL DEFAULT 'PENDING',

  submitted_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submitted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  office_remarks     TEXT NULL,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_submission_year_office_item UNIQUE (year, office_id, checklist_item_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_filters
  ON submissions(year, governance_area_id, office_id, status);

CREATE INDEX IF NOT EXISTS idx_submissions_item
  ON submissions(checklist_item_id);

DROP TRIGGER IF EXISTS trg_submissions_updated_at ON submissions;
CREATE TRIGGER trg_submissions_updated_at
BEFORE UPDATE ON submissions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- SUBMISSION FILES (versioned)
-- =========================
CREATE TABLE IF NOT EXISTS submission_files (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id    UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,

  version_no       INT NOT NULL DEFAULT 1,
  file_name        TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  file_size_bytes  BIGINT NOT NULL,
  storage_key      TEXT NOT NULL,
  sha256           TEXT NULL,

  uploaded_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current       BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT uq_submission_files_version UNIQUE (submission_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_submission_files_submission_id ON submission_files(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_files_current ON submission_files(submission_id, is_current);

-- One current file per submission
CREATE UNIQUE INDEX IF NOT EXISTS ux_submission_files_one_current
  ON submission_files(submission_id)
  WHERE is_current = TRUE;

-- =========================
-- REVIEWS (history of decisions)
-- =========================
CREATE TABLE IF NOT EXISTS reviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  reviewed_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action         review_action NOT NULL,
  decision_notes TEXT NULL,
  reviewed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_submission_id ON reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_by ON reviews(reviewed_by);

-- =========================
-- VERIFICATION CHECKS (per review)
-- =========================
CREATE TABLE IF NOT EXISTS verification_checks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  check_key  TEXT NOT NULL, -- e.g. SIGNED, CORRECT_YEAR
  is_passed  BOOLEAN NOT NULL,
  notes      TEXT NULL,
  CONSTRAINT uq_verification_review_key UNIQUE (review_id, check_key)
);

CREATE INDEX IF NOT EXISTS idx_verification_review_id ON verification_checks(review_id);

-- =========================
-- SUBMISSION COMMENTS (two-way)
-- =========================
CREATE TABLE IF NOT EXISTS submission_comments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  comment        TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_submission_id ON submission_comments(submission_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON submission_comments(author_user_id);

-- =========================
-- NOTIFICATIONS (optional)
-- =========================
CREATE TABLE IF NOT EXISTS notifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type               notification_type NOT NULL,
  title              TEXT NOT NULL,
  body               TEXT NULL,
  link_submission_id UUID NULL REFERENCES submissions(id) ON DELETE SET NULL,
  is_read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read);

-- =========================
-- AUDIT LOGS
-- =========================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,          -- e.g. UPLOAD_FILE, APPROVE
  entity_type   TEXT NOT NULL,          -- e.g. SUBMISSION, TEMPLATE
  entity_id     UUID NULL,
  metadata      JSONB NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- =========================
-- REPORT EXPORTS
-- =========================
CREATE TABLE IF NOT EXISTS report_exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  year            INT NOT NULL,
  governance_area_id UUID NULL REFERENCES governance_areas(id) ON DELETE SET NULL,
  office_id       UUID NULL REFERENCES offices(id) ON DELETE SET NULL,
  status_filter   submission_status NULL,
  format          export_format NOT NULL,
  file_storage_key TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_exports_requested_by ON report_exports(requested_by);
CREATE INDEX IF NOT EXISTS idx_report_exports_filters ON report_exports(year, governance_area_id, office_id);

-- =========================
-- OFFICE GOVERNANCE ASSIGNMENTS
-- Which governance areas each office is required to comply with per year
-- =========================
CREATE TABLE IF NOT EXISTS office_governance_assignments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id          UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  governance_area_id UUID NOT NULL REFERENCES governance_areas(id) ON DELETE CASCADE,
  year               INT NOT NULL,
  assigned_by        UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  assigned_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_office_governance_year UNIQUE (office_id, governance_area_id, year)
);

CREATE INDEX IF NOT EXISTS idx_oga_office_year ON office_governance_assignments(office_id, year);
CREATE INDEX IF NOT EXISTS idx_oga_governance_year ON office_governance_assignments(governance_area_id, year);

-- =========================
-- AUTH SESSIONS (for refresh token security)
-- =========================
CREATE TABLE IF NOT EXISTS auth_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  user_agent         TEXT NULL,
  ip_address         TEXT NULL,
  expires_at         TIMESTAMPTZ NOT NULL,
  revoked_at         TIMESTAMPTZ NULL,
  last_activity_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_revoked ON auth_sessions(revoked_at);

-- =========================
-- PASSWORD RESET TOKENS (for forgot password flow)
-- =========================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

COMMIT;