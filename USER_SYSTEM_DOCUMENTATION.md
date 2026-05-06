# SGLG Monitoring System

*City Planning and Development Office (CPDO)*

## User and System Documentation

**System Name:** SGLG Monitoring System (CPDO)  
**System Type:** Web Application (Frontend + API Backend + PostgreSQL)  
**Version:** Based on current repository state  
**Last Updated:** May 5, 2026

---

## 1. Purpose

This document describes the actual implementation of the SGLG Monitoring System (CPDO) in this repository, including:

- technologies used to build and run the app
- system architecture and module design
- setup and deployment procedures
- security model and access control
- operational workflows for users and IT admins
- troubleshooting and maintenance guidance

---

## 2. System Overview

The SGLG Monitoring System is a browser-based compliance and submission tracking platform operated by CPDO. It is used to manage governance checklist templates, office submissions, reviews, notifications, reports, and audit logs.

### Core Capabilities

- user authentication with secure session handling
- role-based access (ADMIN, STAFF, OFFICE)
- governance area and checklist template management
- office-level submission upload and tracking
- review decisions (approve, deny, revision requested)
- comments and notification workflows
- dashboard analytics and exportable reports
- audit trail for critical actions

---

## 3. Technology Stack (Actual)

### Frontend

- React 19 + Vite
- React Router
- React Query
- React Hook Form + Zod
- Axios
- Tailwind CSS + Radix UI + ShadCN components
- Recharts (data visualization)

### Backend

- Node.js (ES modules)
- Express 5
- PostgreSQL (`pg` client)
- JWT authentication
- Argon2 password hashing
- Cookie-based refresh flow with CSRF protection
- Multer + AWS S3 SDK + Backblaze B2 (file storage)
- Nodemailer (email workflows)
- PDFKit + ExcelJS (report exports)
- Helmet, CORS, rate limiting, logging (`pino`, `morgan`)

### Database

- PostgreSQL
- SQL schema managed in `backend/src/db/schema.sql`

---

## 4. High-Level Architecture

### Components

1. **Frontend SPA** (`frontend`)  
   Serves the user interface and communicates with backend APIs.

2. **REST API Backend** (`backend`)  
   Handles auth, business logic, data access, files, reports, notifications.

3. **PostgreSQL Database**  
   Stores users, roles, templates, submissions, files metadata, reviews, logs.

4. **Object Storage (Backblaze B2 via S3 API)**  
   Stores uploaded files and report artifacts.

### Request Flow

1. User logs in via frontend.
2. Backend validates credentials and returns access token + refresh-cookie session.
3. Frontend sends Bearer token and session headers for protected routes.
4. Backend validates role, session inactivity, and CSRF for mutating actions.
5. Data is persisted in PostgreSQL; files are uploaded to B2 when needed.

---

## 5. Repository Structure

### Top-Level

- `backend/` - API server and data layer
- `frontend/` - React application
- `DEVELOPER_GUIDE.md` - existing project-specific development notes

### Backend Key Paths

- `backend/src/server.js` - API startup logic
- `backend/src/app.js` - middleware and route composition
- `backend/src/routes/` - endpoint modules
- `backend/src/controllers/` - API handlers
- `backend/src/models/` - data access/query modules
- `backend/src/db/schema.sql` - DB schema
- `backend/src/scripts/apply-schema.js` - schema application script
- `backend/src/scripts/seed.js` - seed users and offices

### Frontend Key Paths

- `frontend/src/app/router.jsx` - route map and guards
- `frontend/src/pages/` - page-level UI
- `frontend/src/api/` - API request wrappers
- `frontend/src/lib/axios.js` - axios instance, token/refresh flow
- `frontend/src/guards/` - protected route and role guard logic
- `frontend/src/components/` - reusable UI components

---

## 6. Environment and Configuration

### Backend Required Environment Variables

- `DATABASE_URL`
- `CORS_ORIGIN`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

### Common Optional Environment Variables

- `PORT`
- `DATABASE_SSL`
- `ACCESS_TOKEN_TTL`
- `REFRESH_TOKEN_TTL_DAYS`
- `INACTIVITY_TIMEOUT_MINUTES`
- `UPLOAD_QUOTA_BYTES`
- `COOKIE_SECURE`
- `COOKIE_DOMAIN`
- SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, etc.)
- B2 settings (`B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`, `B2_ENDPOINT`)
- `FRONTEND_URL`, `PUBLIC_API_URL`

### Frontend Environment Variable

- `VITE_API_URL` - base URL for backend API requests

---

## 7. Database Design Summary

The database schema includes:

- roles and users
- offices and governance areas
- years
- checklist templates and checklist items (supports hierarchy)
- submissions
- submission files with versioning
- reviews and verification checks
- submission comments
- notifications
- audit logs
- report exports
- office-governance assignments
- auth sessions
- password reset tokens
- email verification tokens

### Key Business Rules in Schema

- unique template per governance area and year
- unique submission per year + office + checklist item
- versioned file uploads with one active/current file per submission
- role constraint limited to `ADMIN`, `STAFF`, `OFFICE`
- year constraint limited to 2000-2100

---

## 8. Authentication and Security Model

### Auth Flow

- login endpoint validates user credentials
- frontend stores access token in local storage
- refresh token lifecycle is managed by backend session + cookie
- frontend auto-refreshes access token on 401 (except login/refresh)

### Session Security

- session ID is sent as `x-session-id`
- backend checks inactivity timeout using `auth_sessions.last_activity_at`
- inactive sessions are rejected and user is forced to re-login

### CSRF

- mutating requests (`POST/PUT/PATCH/DELETE`) include CSRF token from cookie
- backend verifies CSRF on protected mutation routes (for example refresh/logout)

### Access Control

- route protection on both frontend and backend
- role-based guards:
  - `ADMIN`: full admin areas (users, templates, governance setup)
  - `STAFF`: operational review/report areas
  - `OFFICE`: office-facing submission/compliance scope

### Platform Security Middleware

- `helmet` for secure headers
- rate limiting on auth and global API
- CORS with credentials
- secure cookie configuration via env

---

## 9. API Modules (Current)

Mounted under `/api`:

- `/auth`
- `/users`
- `/offices`
- `/governance-areas`
- `/templates`
- `/submissions`
- `/files`
- `/notifications`
- `/reports`
- `/dashboard`
- `/analytics`
- `/audit-logs`
- `/years`

---

## 10. Frontend Functional Pages (Current Router)

### Public

- `/login`
- `/forgot-password`

### Protected

- `/dashboard`
- `/profile`
- `/notifications`
- `/settings`
- `/submissions`
- `/audit-logs`

### Role-Specific Areas

- governance management and compliance pages (ADMIN)
- templates pages (ADMIN)
- years management (ADMIN)
- users management (ADMIN)
- offices and reports pages (ADMIN/STAFF)
- file manager (ADMIN/STAFF)
- my checklists (OFFICE)

---

## 11. File Upload and Storage

### Upload Handling

- backend uses `multer` + `multer-s3`
- files are uploaded directly to B2 bucket via S3-compatible API
- file size limit: **25 MB**

### Allowed Upload MIME Types

- PDF
- JPEG
- PNG
- DOCX
- XLSX

File extension is validated against MIME type before accepting upload.

---

## 12. Reporting and Exports

The system supports data-driven report generation and export.

### Export Formats

- CSV
- XLSX (selected report types)
- PDF

### Current Report Features

- summary by submission status
- missing uploads report
- dashboard executive report
- compliance progress report

---

## 13. Logging, Audit, and Notifications

### Logging

- HTTP logs via `morgan`
- structured logs via `pino` and `pino-http`

### Audit

- critical actions are recorded in `audit_logs`
- includes actor, action, entity, metadata, timestamp

### Notifications

- stored in `notifications` table
- read/unread tracking per user
- includes workflow events (submission received, approved, denied, etc.)

---

## 14. Local Development Setup

## Prerequisites

- Node.js (LTS recommended)
- PostgreSQL
- Access to configured Backblaze B2 bucket (for uploads)

### Backend Setup

1. Open terminal in `backend`.
2. Install dependencies:
   - `npm install`
3. Configure environment variables (`.env`).
4. Apply schema:
   - `npm run db:schema`
5. Seed initial records:
   - `npm run seed`
6. Run API:
   - `npm run dev`

### Frontend Setup

1. Open terminal in `frontend`.
2. Install dependencies:
   - `npm install`
3. Set `VITE_API_URL` to backend URL.
4. Run dev server:
   - `npm run dev`

---

## 15. Deployment Checklist

### Backend

- set all required environment variables
- point `DATABASE_URL` to production PostgreSQL
- set secure JWT secrets
- configure CORS and cookie security for production domain
- configure B2 credentials and bucket
- configure SMTP if email features are required
- run schema and seed as needed

### Frontend

- set `VITE_API_URL` to deployed backend API URL
- build frontend: `npm run build`
- deploy static assets to web host

### Post-Deployment Validation

- login works for all roles
- token refresh works
- role-based route restrictions are correct
- submission upload and replacement works
- reports export correctly (CSV/XLSX/PDF)
- notifications and audit logs are being populated

---

## 16. User Administration

In this system, user accounts are managed inside the web app/backend (not via separate desktop executable).

### Typical User Lifecycle

1. Admin creates user account.
2. User receives/uses credentials.
3. User role defines route and data access scope.
4. User can update own profile (`/auth/me` patch flow).
5. Password reset and email verification are supported by token workflows.

### Seeded Roles

- `ADMIN` - administrator
- `STAFF` - staff member
- `OFFICE` - office head / office-scoped user

---

## 17. Operations and Maintenance

### Regular Maintenance Tasks

- monitor API/server logs
- monitor DB size and query performance
- rotate JWT secrets and service credentials per policy
- clean up expired auth/password/email tokens
- verify object storage lifecycle/retention rules
- review audit logs for suspicious actions

### Backup Recommendations

- schedule periodic PostgreSQL backups
- ensure upload storage has backup/retention policy
- keep environment variable backups in secure secret manager

---

## 18. Troubleshooting Guide

### A. API Does Not Start

**Possible causes**

- missing required env vars
- invalid `DATABASE_URL`
- database unreachable

**Actions**

- validate env file
- test DB connectivity
- check startup logs for missing keys

### B. Frontend Cannot Call API

**Possible causes**

- wrong `VITE_API_URL`
- CORS misconfiguration
- backend down

**Actions**

- verify frontend env value
- verify backend `CORS_ORIGIN`
- test API health endpoint

### C. Login/Session Issues

**Possible causes**

- invalid JWT secrets across environments
- refresh cookie blocked by browser settings/domain
- inactivity timeout triggered

**Actions**

- verify auth env configs
- verify cookie secure/domain settings
- inspect `auth_sessions` records

### D. Upload Fails

**Possible causes**

- unsupported MIME/extension
- file larger than 25 MB
- invalid B2 credentials/bucket settings

**Actions**

- confirm file type and size
- verify B2 env vars and endpoint
- check backend upload errors/logs

### E. Reports Do Not Export

**Possible causes**

- no data for selected filters
- report query constraints invalid
- PDF/XLSX generation errors

**Actions**

- test endpoint with known valid data
- inspect logs from reports controller
- verify permissions and role scope

---

## 19. Known Current Defaults (From Seed Script)

The repository includes seed defaults used for local/demo setup:

- admin account default email/password
- optional demo offices and users

These defaults should be changed/disabled in production environments.

---

## 20. Revision Log

| Version | Date | Author | Notes |
|---|---|---|---|
| 2.0 | 2026-05-05 | AI + Project Owner | Replaced desktop-based guide with actual web app implementation documentation |

# City Planning System
## User and System Documentation

**System Name:** City Planning System  
**Version:** 1.6.3  
**Document Type:** User, Technical, Deployment, and Support Guide  
**Last Updated:** May 5, 2026

---

## 1. Purpose of This Document

This documentation is intended to help IT personnel, administrators, and support staff manage and maintain the deployed City Planning System. It covers:

- system overview and architecture
- deployment locations and critical files
- database access and connection setup
- module and functional structure
- report template maintenance
- software dependencies
- client workstation setup
- troubleshooting and support
- account creation process

---

## 2. System Overview

The City Planning System is a desktop-based application that supports city planning transactions and related workflows.

### Main Technology Stack

- .NET WinForms desktop application
- Microsoft SQL Server
- SQL Server Management Studio (SSMS)
- DOCX template-based report generation
- LibreOffice (DOCX to PDF conversion)
- Microsoft Edge WebView2 Runtime (PDF preview)
- SAP Crystal Reports + Crystal Runtime (32-bit or 64-bit)

---

## 3. Deployed System Location

### Application Folder

Typical deployed folder:

`C:\Users\amley\source\repos\City-Planning-System`

### Important Files and Folders

- `City Planning System.sln` - Visual Studio solution
- `City Planning System\App.config` - deployed configuration file
- `City Planning System\bin\Release\City Planning System.exe` - executable
- `City Planning System\bin\Release\Reports\` - report template folder

---

## 4. Database Information

### Database Name

`City_Planning_DB`

### SQL Server Instance / Server Name

- `AGIE_PC\SQLEXPRESS`  
or  
- `.\SQLEXPRESS`

### Accessing the Database Using SSMS

1. Open SQL Server Management Studio.
2. Connect using:
   - **Server Name:** `<server\instance>`
   - **Authentication:** Windows Authentication or SQL Server Authentication
   - **Username/Password:** required for SQL authentication
3. Open `City_Planning_DB`.

### Connection String Used by the Application

The application reads the database connection from deployed `App.config`.

Typical location:

`C:\Users\amley\source\repos\City-Planning-System\City Planning System\App.config`

Example:

```xml
<connectionStrings>
  <add name="CityPlanningDb"
       connectionString="Data Source=[IPv4 address of Server PC],1433;Initial Catalog=City_Planning_DB;User ID=gem_it_solutions;Password=gemcode_CPv2;TrustServerCertificate=True;"
       providerName="System.Data.SqlClient" />
</connectionStrings>
```

### Important Notes

- The deployed application reads `App.config`.
- If database connection details change, update deployed `App.config`.
- If the Server PC IPv4 address changes, update the connection string accordingly.

---

## 5. Project and Module Structure

### Functional Modules

- Application Intake
- Inspection
- Evaluation
- Order of Payment
- Locational Clearance
- Endorsement
- Land Reclassification
- Zoning Certification
- Occupancy
- Activity Logs
- Dashboard / Navigation

### Common Technical Areas

- UI forms per module
- business logic and service operations
- data access classes for SQL operations
- report templates for generated documents

---

## 6. Report and Template Files

The system uses report templates stored in:

`City Planning System\bin\Release\Reports\`

### Template File Types

- `.docx` templates
- `.rpt` Crystal Report templates

### Template Management Notes

- Missing or renamed templates can cause report generation failure.
- Template names and paths should remain consistent with deployed setup.
- Preserve placeholders and formatting when updating templates.

---

## 7. Required Software and Dependencies

Install these on any PC that will deploy or support the system:

- .NET Runtime / .NET Desktop Runtime
- Microsoft SQL Server
- SQL Server Management Studio (SSMS)
- LibreOffice
- Microsoft Edge WebView2 Runtime
- SAP Crystal Reports for Visual Studio
- SAP Crystal Reports Runtime Engine (32-bit or 64-bit)

### Optional Tools

- Visual Studio 2022 (maintenance and debugging)
- Git (source control)

---

## 8. Installation Guide for a New Client PC

### Step 1: Confirm Access to the Server PC

- Ensure the client PC can access the shared network folder on the Server PC.
- Confirm the client can open the shared project/deployment folder.

### Step 2: Create a Desktop Shortcut

1. From the client PC, open the shared deployment folder.
2. Locate the executable file.
3. Typical path:
   - `[Shared Project Folder]\bin\Release\City Planning System.exe`
4. Create a desktop shortcut for easy access.

### Step 3: Test Initial System Access

Open the app and confirm:

- application starts normally
- login works successfully
- live data is accessible from the Server PC

### Step 4: Install Required Dependencies (if missing)

Install as needed:

- .NET Desktop Runtime Engine
- WebView2 Runtime
- LibreOffice
- Crystal Reports Runtime (32-bit or 64-bit)
- supporting installers (for example: `vcredist_arm`, `vcredist_x64`, `vcredist_x86`)

Installer source (example):

`D:\City Planning System Downloads\`

### Step 5: Re-test After Installation

Confirm:

- application opens correctly
- login works
- modules load correctly
- reports and previews work
- PDF generation works

### Step 6: Final Validation

Deployment is complete once application access and dependencies are fully validated.

---

## 9. Basic Troubleshooting Guide

### A. Application Cannot Log In

**Possible causes**

- wrong connection string in deployed config
- SQL Server service stopped
- wrong SQL server/instance name
- no network connection to SQL Server
- invalid SQL credentials

**Actions**

- check deployed `App.config`
- verify SQL Server service is running
- test connection in SSMS
- verify server name, instance, and credentials

### B. Network or Instance Error

**Possible causes**

- incorrect server/instance
- SQL Server not listening on configured port
- firewall blocking connection
- config uses IP:port while SQL is configured as named instance

**Actions**

- confirm actual SQL instance in SSMS
- check SQL Server Configuration Manager
- check firewall rules and TCP/IP settings
- verify deployed connection string

### C. Report Generation Fails

**Possible causes**

- missing report template
- LibreOffice not installed
- Crystal Runtime not installed
- incorrect template path
- output folder permission issue

**Actions**

- confirm templates exist in `Reports` folder
- confirm LibreOffice is installed
- confirm Crystal Runtime is installed
- check output folder path and permissions

### D. PDF Preview Does Not Open

**Possible causes**

- WebView2 runtime missing
- PDF file locked by another process
- generated file path inaccessible

**Actions**

- install or repair WebView2 Runtime
- close/reopen the form or module
- confirm generated PDF exists and is accessible

### E. Database Restore or Update Issues

**Possible causes**

- wrong backup file
- restoring over incorrect database
- SQL version mismatch
- missing permissions

**Actions**

- verify target database name
- restore to correct SQL Server instance
- inspect database contents in SSMS after restore
- confirm required tables and columns exist

---

## 10. Debugging Tips

### Application Side

- verify `App.config` matches actual database server details
- verify all required DLLs exist in deployment folder
- confirm report templates are in the expected path
- determine if issue is isolated to one module or system-wide

### Database Side

- test direct login via SSMS
- check whether target table contains expected records
- verify required columns exist
- review recent database changes if module behavior changed

### Report Side

- check whether templates were modified
- confirm LibreOffice and WebView2 are installed
- verify DOCX/PDF outputs are generated in output folder

---

## 11. Backup and Recovery Notes

### Database Backup

Back up the database regularly using SSMS or SQL Server backup procedures.

### Before Making Changes

Before editing config files, report templates, schema, or deployed binaries:

- create a backup first
- validate rollback plan
- test in a non-production copy when possible

---

## 12. Updating Report Templates and Fixed Office Details

Use this section for changes to fixed text content such as personnel names, signatories, titles, and office address.

### Step 1: Open the Project Solution

1. Open the `.sln` file in Visual Studio 2022.
2. Example:
   - `C:\Users\amley\source\repos\City-Planning-System\City Planning System.sln`

### Step 2: Locate Report Templates

In **Solution Explorer**, locate the `Reports` folder containing:

- `.docx` templates
- `.rpt` templates

### Step 3: Edit `.docx` Template Files

1. In Solution Explorer, open the `.docx` template.
2. Edit in Microsoft Word.
3. Update only fixed text (for example):
   - personnel names
   - signatories
   - office titles
   - office address
   - fixed labels/wording
4. Save the template.

**Important**  
Do not edit or remove placeholder fields used by the system, such as:

- `${project_name}`
- `${project_location}`
- `${applicant_name}`
- `${lc_id}`
- other similar placeholder fields

These placeholders are automatically replaced during report generation.

### Step 4: Edit `.rpt` Crystal Report Templates

1. In Solution Explorer, open the `.rpt` file.
2. The file opens in Crystal Report Designer (Visual Studio 2022).
3. Select and edit only the fixed text object.
4. Save report.

Examples of editable fixed text:

- names of personnel
- office designations
- address lines
- static headings
- fixed labels

**Important**  
Do not edit or remove dynamic database/formula fields, such as:

- `{applicant_name}`
- `{@RecommendationText}`
- `{@SomeFormulaField}`
- other database/formula-driven fields

These are required to display transaction data correctly.

### Step 5: Save and Review Changes

After editing:

- save `.docx` or `.rpt` normally
- review changes in Git Changes (Visual Studio 2022)
- undo unintended edits before closing

### Step 6: Test the Updated Template

1. Run the system
2. Generate sample report
3. Confirm:
   - updated fixed text appears correctly
   - report layout remains correct
   - placeholders are still replaced properly
   - preview and printing work as expected

### Step 7: Important Reminders

- edit only fixed/static text when possible
- avoid changing placeholder values
- avoid renaming template files unless system references are updated
- if accidental changes occur, review and revert in Git Changes

---

## 13. User Account Creation Utility

Creation of new system user accounts is **outside the main system modules**.

### Step 1: Locate the Account Creation Executable

Find the utility executable in the deployment/download location.

Example:

`D:\City Planning System Downloads\Create User Account\City Planning System.exe`

### Step 2: Run the Utility

Double-click the executable to open the account creation utility.

### Step 3: Enter Required User Information

Provide:

- username
- password
- role or access level

Ensure assigned role matches intended access.

### Step 4: Save the New Account

Use the utility to save the account details.

### Step 5: Test the New Account

1. Open the main system.
2. Log in using the new username/password.
3. Confirm module access is correct for the assigned role.

### Important Note

Because account creation is managed outside the main system:

- keep track of where this executable is stored
- restrict use to authorized IT personnel only

---

## 14. Document Control (Recommended)

Use this section to track revisions.

| Version | Date | Updated By | Description of Changes |
|---|---|---|---|
| 1.0 | 2026-05-05 | IT Team | Initial consolidated user/system documentation |

