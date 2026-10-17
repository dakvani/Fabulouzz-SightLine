# Fabulouzz SightLine — Enterprise Administrator Manual

**Document Version:** 2.4.0  
**Effective Date:** October 2026  
**Classification:** Confidential — System Administrators & Operational Leadership Only  
**Product:** Fabulouzz SightLine (Enterprise Project Monitoring & Command Center SaaS)  
**Author / Publisher:** Fabulouzz Technologies / DVHQ  

---

## Table of Contents

1. [System Overview & Architecture](#1-system-overview--architecture)
2. [User Roles & Privilege Hierarchy](#2-user-roles--privilege-hierarchy)
3. [Authentication & Security Controls](#3-authentication--security-controls)
4. [User Administration & Account Lifecycle](#4-user-administration--account-lifecycle)
5. [Project Management & Assignment System](#5-project-management--assignment-system)
6. [Client Portal Administration](#6-client-portal-administration)
7. [Audit Logging & Compliance Monitoring](#7-audit-logging--compliance-monitoring)
8. [Database, Row Level Security & Migration Procedures](#8-database-row-level-security--migration-procedures)
9. [White-Label Branding & SaaS Billing Administration](#9-white-label-branding--saas-billing-administration)
10. [Service Operations & High-Availability Management](#10-service-operations--high-availability-management)
11. [Troubleshooting & Disaster Recovery Runbook](#11-troubleshooting--disaster-recovery-runbook)

---

## 1. System Overview & Architecture

### 1.1 Platform Description

**Fabulouzz SightLine** is a mission-critical, real-time command center and project monitoring SaaS platform tailored for contractor execution, engineering leadership, and client stakeholder visibility. It bridges real-time field operations with executive reporting through Gantt timelines, interactive Kanban boards, telemetry integration, and automated document generation.

### 1.2 Technology Stack

| Layer | Technologies | Deployment Role |
| --- | --- | --- |
| **Frontend Application** | React 18, TypeScript 5, Vite 5 | Single Page Application (SPA) with responsive glassmorphism UI |
| **Component System** | Radix UI primitives (`shadcn/ui`), Tailwind CSS, Lucide Icons | Accessible, responsive design system |
| **Client State & Cache** | TanStack React Query v5, Context API | Asynchronous server caching & optimistic UI updates |
| **Backend & Database** | Supabase (PostgreSQL 15+, Auth, Storage, Edge Functions) | Enterprise data store, RLS security, and Deno edge workers |
| **Realtime Engine** | Supabase Realtime (WebSocket CDC) | Postgres change-data-capture push for tasks & milestones |
| **Document Engine** | jsPDF, jsPDF-AutoTable | Client-side and server-side encrypted PDF report generation |
| **Authentication** | Supabase Auth (Argon2id password hashing, JWT sessions) | Token-based stateless authentication with MFA support |

### 1.3 High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  USER BROWSERS                                    |
|   +--------------------+  +--------------------+  +----------------------------+  |
|   | Super Admin Deck   |  | Admin Command Deck |  | Client Monitoring Portal   |  |
|   +--------------------+  +--------------------+  +----------------------------+  |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / WSS
                                           v
+-----------------------------------------------------------------------------------+
|                            VITE SPA APPLICATION SERVER                            |
|             Route Guards | Authorization Policies | Permission Matrix             |
+------------------------------------------+----------------------------------------+
                                           | REST API / GraphQL / Realtime
                                           v
+-----------------------------------------------------------------------------------+
|                                SUPABASE BACKEND                                   |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  | PostgreSQL Database|  | GoTrue Auth Server |  | Edge Functions (Deno)       |  |
|  | - Tables & Views   |  | - Argon2id Hashing |  | - admin-create-user         |  |
|  | - Row Level Security|  | - JWT Tokens       |  | - admin-manage-user         |  |
|  | - Audit Triggers   |  | - MFA Validation   |  | - stripe-webhook            |  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. User Roles & Privilege Hierarchy

Fabulouzz SightLine implements a strict **Three-Tier, Four-Role** privilege model. System authority flows downward; lower tiers can never inspect or alter upper-tier configurations.

```
       +-------------------------------------------------------------+
       |                  TIER 1: SYSTEM OWNER                       |
       |                      SUPER_ADMIN                            |
       |  - Global system config      - Security policy override     |
       |  - Complete audit logs       - Protected owner accounts     |
       +------------------------------+------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       |             TIER 2: CONTRACTOR ADMINISTRATION               |
       |                         ADMIN                               |
       |  - All operational projects  - Provision PMs & Clients      |
       |  - Project assignment        - Scope & milestone management |
       +------------------------------+------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       |              TIER 3: PROJECT-LEVEL SCOPED                   |
       |                                                             |
       |    PROJECT_MANAGER (Contractor)     CLIENT (Stakeholder)    |
       |    - Assigned projects only         - Assigned projects only|
       |    - Task & Kanban execution        - Strictly read-only    |
       |    - Daily progress logging         - Report downloads      |
       +-------------------------------------------------------------+
```

### 2.1 Detailed Role Definitions

#### 1. SUPER_ADMIN (Tier 1 – System Owner)

- **Designated Account:** `support@fabulouzz.com` (Permanent Corporate System Owner).
- **Primary Function:** Overall system ownership, infrastructure integrity, and corporate governance.
- **Authority:** Unrestricted across all projects, tenants, users, and audit records.
- **Exclusive Privileges:**
  - Access to the **Main System Administration Panel**.
  - Modification of global security and rate-limiting policies.
  - Creation, role modification, and deactivation of `admin` and `super_admin` accounts.
  - Full inspection of raw immutable audit logs.
  - Organization-wide branding and subscription tier overrides.
- **Safety Safeguard:** Protected by the database trigger `protect_last_super_admin`, preventing accidental deactivation or deletion of the last surviving Super Admin. Direct database resolution ensures `support@fabulouzz.com` maintains immutable Tier 1 root ownership.

#### 2. ADMIN (Tier 2 – Contractor Administration)

- **Primary Function:** Operational leadership across all corporate projects and client contracts.
- **Authority:** Full operational control over all projects belonging to the contractor's organization.
- **Permitted Operations:**
  - Create, edit, and archive projects.
  - Define work breakdown structures (WBS), scopes, and deliverable milestones.
  - Provision `pm` (Project Manager) and `client` (Client) accounts.
  - Assign and revoke user memberships to specific projects.
  - Review operational logs and export executive reports.
- **Strict Restrictions:**
  - **Cannot** view or edit Super Admin accounts.
  - **Cannot** promote any user (including self) to Super Admin.
  - **Cannot** access system-level configuration or master security settings.
  - **Cannot** bypass project data isolation boundaries.

#### 3. PROJECT_MANAGER (Tier 3 – Project Execution)

- **Primary Function:** Day-to-day execution and operational supervision of designated projects.
- **Authority:** Strictly project-scoped. Access is granted only to projects explicitly assigned by an Admin or Super Admin.
- **Permitted Operations:**
  - Update Kanban card states and progress stages.
  - Create and edit tasks within assigned projects.
  - Update milestone schedules and project completion percentages.
  - Upload project documentation and technical drawings.
  - View internal contractor notes and proprietary operational remarks.
- **Strict Restrictions:**
  - Cannot view or search unassigned projects.
  - Cannot create new projects or assign team members.
  - Cannot access administrative menus or user directories.

#### 4. CLIENT (Tier 3 – Stakeholder Monitoring)

- **Primary Function:** High-transparency, executive project monitoring for client representatives.
- **Authority:** Strictly project-scoped and **strictly read-only**.
- **Permitted Operations:**
  - Access the dedicated **Client Monitoring Portal**.
  - Monitor overall milestone progress, S-curve progress, and completion percentages.
  - View Kanban cards in read-only mode (card dragging and inline editing are disabled).
  - Inspect approved scopes and deliverables.
  - Generate and download authorized PDF and CSV project summary reports.
- **Strict Restrictions:**
  - Cannot perform any database write operations.
  - Cannot view internal contractor notes, internal subcontractor margins, or cost markups.
  - Cannot view projects outside their contractual assignments.

### 2.2 Permissions Matrix

| Functional Capability | Super Admin | Admin | Project Manager | Client |
| --- | :---: | :---: | :---: | :---: |
| System Administration Panel | Full | Denied | Denied | Denied |
| Global Security Configuration | Full | Denied | Denied | Denied |
| Super Admin User Management | Full | Denied | Denied | Denied |
| Admin User Management | Full | Denied | Denied | Denied |
| Project Manager Management | Full | Full | Denied | Denied |
| Client Account Management | Full | Full | Denied | Denied |
| Create New Projects | Yes | Yes | Denied | Denied |
| View All Projects | Yes | Yes | Denied | Denied |
| View Assigned Projects Only | Yes | Yes | Yes | Yes |
| Modify Kanban Cards | Yes | Yes | Assigned Only | Denied |
| View Kanban Board | Yes | Yes | Assigned Only | Read-Only |
| Edit Project Scope | Yes | Yes | Operational Only | Denied |
| Edit Milestones & Timelines | Yes | Yes | Assigned Only | Denied |
| Upload Project Documents | Yes | Yes | Assigned Only | Denied |
| View Client-Visible Documents | Yes | Yes | Yes | Yes |
| View Internal Contractor Notes | Yes | Yes | Assigned Only | Denied |
| Export Authorized Reports | Yes | Yes | Assigned Only | Assigned Only |
| View Full Audit Logs | Full | Operational Only | Denied | Denied |

---

## 3. Authentication & Security Controls

### 3.1 Authentication Workflow

Authentication is mediated by Supabase Auth using industry-standard cryptographic primitives:

1. **Password Hashing:** Passwords are never stored in plaintext or reversible formats; hashing uses **Argon2id** with salt generation.
2. **Session Tokens:** Successful authentication yields an asymmetric JSON Web Token (JWT) with standard expiration (1 hour) and an HTTP-only secure refresh token.
3. **Authoritative Role Resolution:** Roles are not determined by mutable client tokens. Upon login, the client invokes `resolveUserAuth()`, which reads directly from `public.profiles` with security definer validation.

### 3.2 Password Policy

All enterprise accounts must adhere to the following baseline password complexity requirements:

- Minimum length of **10 characters** (14 recommended for Super Admins).
- At least one uppercase Latin character (`A-Z`).
- At least one lowercase Latin character (`a-z`).
- At least one numeric digit (`0-9`).
- At least one special symbol (`!@#$%^&*()-_=+[]{}|;:,.<>?`).

### 3.3 Brute-Force Protection & Rate Limiting

The application features an exponential backoff lock mechanism:

- After **5 consecutive failed attempts**, login requests for the target email/IP are throttled for a 60-second cooldown period.
- Repeated threshold breaches trigger an automated `AUTH_LOCKED` security event recorded in `public.audit_logs`.

### 3.4 Multi-Factor Authentication (MFA)

Multi-Factor Authentication (TOTP via Google Authenticator, Authy, or 1Password) is supported and enforced for Tier 1 and Tier 2 administrators:

1. User navigates to **User Profile > Security Settings**.
2. Scans the generated RFC 6238 QR code.
3. Enters the 6-digit confirmation code.
4. Stores one-time recovery codes in a secure vault.

---

## 4. User Administration & Account Lifecycle

### 4.1 User Provisioning Standard Operating Procedure (SOP)

Administrators create users through the **Admin Console (`/admin`)**:

```
[Admin Deck] ---> [Users Tab] ---> [Add New User]
                                         |
                                         v
                         +-------------------------------+
                         | Full Name                     |
                         | Email Address                 |
                         | Role (Admin / PM / Client)*   |
                         | Organization / Client Company |
                         | Initial Project Assignment    |
                         +-------------------------------+
                                         |
                                         v
                      Edge Function: admin-create-user
                                         |
                                         +--> Validates privilege hierarchy
                                         +--> Creates auth.users entry
                                         +--> Inserts public.profiles record
                                         +--> Creates project_members link
                                         +--> Writes to public.audit_logs
```

*\*Note: Only Super Admins can select the `admin` or `super_admin` role. The dropdown dynamically filters options according to the operator's privileges.*

### 4.2 Account Deactivation and Suspension

When an employee or client departs, their access must be terminated immediately without deleting historical project logs:

1. Navigate to **Admin Console > Users**.
2. Locate the target user and click **Deactivate Account** (Status toggle).
3. The backend executes `admin-manage-user` with action `update_status` and status `inactive`.
4. **Immediate Invalidation:** The user's active session is terminated server-side. The frontend's `checkAccountActiveOrLogout()` interceptor denies subsequent API requests and forces a redirect to the login screen.
5. Project activity, task authorship, and audit history remain intact for legal and contractual compliance.

### 4.3 Password Reset Procedure

- **Self-Service:** Users can click *"Forgot Password"* on the login modal to receive a time-limited (15-minute) cryptographic magic link.
- **Admin-Assisted:** Admins can trigger a password reset email via the user management row in the Admin Console.

---

## 5. Project Management & Assignment System

### 5.1 Project Creation & Setup

Admins and Super Admins initialize new projects via **Admin Console > Projects > New Project**:

1. **Project Identification:** Name, unique project code (e.g., `PRJ-2026-08`), and description.
2. **Contractual Parties:** Contractor entity name, client organization, and site location.
3. **Baseline Schedule:** Start date, planned completion date, and working days calendar.
4. **Telemetry Setup:** Optional GPS coordinates (Latitude/Longitude) for real-time site weather forecasting.

### 5.2 Project Assignment Architecture

Project membership is governed by `public.project_members`:

```sql
CREATE TABLE public.project_members (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id),
    user_id UUID REFERENCES auth.users(id),
    assigned_role app_role NOT NULL,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    revoked_at TIMESTAMPTZ NULL,
    assignment_status TEXT DEFAULT 'active'
);
```

### 5.3 Step-by-Step Assignment Workflow

1. Navigate to **Admin Console > Project Assignments**.
2. Select the target user from the left-hand directory.
3. Review currently assigned projects vs. available organization projects.
4. Check the box next to the target project.
5. The system records the assignment, attaching:
   - `assigned_by`: Authenticated Admin ID.
   - `assigned_at`: Current server timestamp.
   - `assignment_status`: `'active'`.
6. **Instant Visibility:** The assigned project immediately appears in the user's dashboard and project selector without requiring re-login.

### 5.4 Revocation Workflow

1. Uncheck the project box in the assignment panel.
2. The system sets `assignment_status = 'revoked'` and stamps `revoked_at = now()`.
3. Subsequent database queries by that user are immediately blocked by RLS policies.
4. Real-time WebSocket channels for that project are denied.
5. The revocation event is committed to `public.audit_logs`.

---

## 6. Client Portal Administration

### 6.1 Purpose & Guarantees

The **Client Portal** is a purpose-built interface designed to provide enterprise clients with 100% transparency while ensuring 0% risk of unauthorized modifications or data leakage.

### 6.2 Client View Elements

- **Project Header & KPI Cards:** Overall completion percentage, planned vs. actual schedule variance, total approved scopes, active tasks count.
- **Approved Scope Tracker:** Visual status breakdown (`Approved`, `In Progress`, `Pending Verification`).
- **Read-Only Kanban Deck:** Visual board reflecting real-time task statuses (`Planning`, `Initiating`, `Processing`, `Completed`). Drag-and-drop handles are completely disabled.
- **Interactive Milestone Timeline:** Gantt-style schedule displaying completed, upcoming, and critical path milestones.
- **Live Telemetry & Site Weather:** Live temperature, wind conditions, and 3-day forecast at the project site.
- **Executive Reporting & Export:** Instant download of signed project progress reports in **PDF** or **CSV/Excel** format.

### 6.3 Data Sanitization Policy

The backend and API layer automatically filter records dispatched to Client users:

- **Scrubbed Fields:** `internal_contractor_notes`, `subcontractor_margin`, `cost_variance_internal`, `labor_hours_rate`.
- Any task marked `client_visible = false` is excluded from queries at the database RLS level.

---

## 7. Audit Logging & Compliance Monitoring

### 7.1 Immutable Audit Log Schema

All sensitive system actions are recorded in `public.audit_logs`:

```sql
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id),
    actor_email TEXT,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 7.2 Logged Event Categories

| Category | Event Actions | Logged Attributes |
| --- | --- | --- |
| **Authentication** | `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_RESET` | Actor email, IP, browser user agent |
| **User Governance** | `USER_CREATED`, `USER_DEACTIVATED`, `ROLE_MODIFIED` | Target user ID, assigned role, initiator |
| **Project Assignment** | `PROJECT_ASSIGNED`, `PROJECT_REVOKED` | Target user, project ID, assignment timestamp |
| **Project Management** | `PROJECT_CREATED`, `PROJECT_DELETED`, `SCOPE_MODIFIED` | Project ID, modified fields, delta |
| **Security & System** | `SECURITY_SETTINGS_UPDATED`, `UNAUTHORIZED_ACCESS_ATTEMPT` | Attempted endpoint, operator role, failure reason |
| **Report Generation** | `REPORT_EXPORTED` | Project ID, report type (PDF/CSV), actor ID |

### 7.3 Log Inspection & Retention

- **Viewing Logs:** Super Admins can filter logs in the **Admin Console > Audit Logs** tab by date, actor, action, and resource.
- **Immutability:** RLS policies explicitly forbid `UPDATE` and `DELETE` operations on `public.audit_logs`.
- **Retention Period:** Default retention is **7 years** for enterprise compliance and audit trail verifiability.

---

## 8. Database, Row Level Security & Migration Procedures

### 8.1 Row Level Security (RLS) Policy Architecture

Every core table enforces RLS. Anonymous reads are strictly disabled.

#### Policy Rule Set Example (`public.projects`)

```sql
-- Super Admin & Admin: Read all projects
CREATE POLICY "Admins view all projects" ON public.projects
    FOR SELECT TO authenticated
    USING (public.is_admin_or_super(auth.uid()));

-- PM & Client: Read assigned projects only
CREATE POLICY "Members view assigned projects" ON public.projects
    FOR SELECT TO authenticated
    USING (public.has_project_access(auth.uid(), id));

-- Write access: Super Admin & Admin only
CREATE POLICY "Admins manage projects" ON public.projects
    FOR ALL TO authenticated
    USING (public.is_admin_or_super(auth.uid()))
    WITH CHECK (public.is_admin_or_super(auth.uid()));
```

### 8.2 Database Migration SOP

1. Migrations are stored chronologically in `supabase/migrations/`.
2. Format: `YYYYMMDDHHMMSS_<description>.sql`.
3. To apply migrations to the production environment:

   ```bash
   npx supabase db push
   ```

4. Verify migration integrity:

   ```sql
   SELECT name, applied_at FROM supabase_migrations.schema_migrations ORDER BY version DESC;
   ```

### 8.3 Database Backup & Restore SOP

- **Automated Daily Backups:** Handled via Supabase managed storage with Point-in-Time Recovery (PITR).
- **Manual Physical Dump:**

  ```bash
  pg_dump -h db.dxohbmgalsxswmpptyqy.supabase.co -U postgres -d postgres -F c -b -v -f "sightline_backup_$(date +%Y%m%d).dump"
  ```

- **Restore:**

  ```bash
  pg_restore -h db.dxohbmgalsxswmpptyqy.supabase.co -U postgres -d postgres -v -c "sightline_backup_YYYYMMDD.dump"
  ```

---

## 9. White-Label Branding & SaaS Billing Administration

### 9.1 Branding Customization

The system allows full white-labeling via **Admin Console > Branding**:

- **Company Name:** Replaces all visual headers and document titles.
- **Company Logo:** Upload light/dark PNG logos (recommended: 300x80px, transparent background).
- **Primary Accent Color:** Hex color picker dynamically alters the application's CSS variables (`--primary`, `--ring`, `--primary-foreground`).
- **PDF Report Header:** Custom letterhead, legal disclaimer, and company registration text.

### 9.2 Subscription Tier Management

- **Free Tier:** Up to 2 active projects, standard support.
- **Premium Tier:** Up to 15 active projects, custom branding, unlimited PDF exports.
- **Enterprise Tier:** Unlimited projects, dedicated audit log export, custom domain, priority 24/7 SLA.
- **Admin Override:** Administrators possess `isEnterprise = true` by default, unlocking all system features regardless of public billing state.

---

## 10. Service Operations & High-Availability Management

### 10.1 Windows Service & Daemon Management

SightLine incorporates silent, background, reboot-persistent execution for continuous operational display on command center screens:

| Action | Command | Purpose |
| --- | --- | --- |
| **Check Health** | `npm run service:status` | Validates process status and sends HTTP probe to port 8080 |
| **Start Service** | `npm run service:start-silent` | Launches Vite SPA in detached background mode (no CMD window) |
| **Stop Service** | `npm run service:stop` | Terminates active Node/Vite processes on port 8080 |
| **Enable Autostart** | `npm run service:install-autostart` | Registers Windows Task Scheduler task (`FabulouzzSightLine`) |
| **Disable Autostart** | `npm run service:uninstall-autostart` | Unregisters Windows startup hooks |

### 10.2 Port Allocation Rules

To avoid port collisions across local infrastructure servers:

- **SightLine SPA:** Port `8080` (or `8085+` in development).
- **Prohibited Ports (Reserved for Host Services):**
  - `3000`: Corporate HRMS
  - `3100`: WHM Server Management
  - `8069`: Odoo ERP Gateway

---

## 11. Troubleshooting & Disaster Recovery Runbook

### 11.1 Common Operational Issues & Resolutions

#### Issue 1: "User sees 'No Assigned Projects' after logging in"

- **Cause:** The user was created with role `pm` or `client` but has not been linked to a project in `project_members`.
- **Resolution:** Navigate to **Admin Console > Project Assignments**, select the user, check the designated project, and verify the record is saved.

#### Issue 2: "User cannot edit Kanban tasks despite having Project Manager role"

- **Cause:** User has not been assigned to that specific project, or their account status is marked `inactive`.
- **Resolution:** Verify project assignment status in `project_members` where `assignment_status = 'active'` and `revoked_at IS NULL`.

#### Issue 3: "Client reports seeing an error when generating PDF reports"

- **Cause:** Network timeout or browser pop-up blocker preventing blob download.
- **Resolution:** Instruct user to permit downloads from the application domain, or export as CSV. Verify that task titles do not contain unsupported binary characters.

#### Issue 4: "Accidental Super Admin lockout"

- **Cause:** If all Super Admins are locked out, run the emergency elevation query directly in Supabase SQL Editor:

  ```sql
  UPDATE public.profiles 
  SET role = 'super_admin', status = 'active' 
  WHERE email = 'authorized_executive@fabulouzz.com';
  ```

---

## 12. Document Control & Sign-off

| Version | Date | Author | Reviewer | Approver | Changes |
| --- | --- | --- | --- | --- | --- |
| 1.0.0 | 2026-01-10 | Engineering Team | Lead Architect | VP Engineering | Initial Release |
| 2.0.0 | 2026-06-15 | DevOps & Security | Security Officer | CTO | RBAC & Realtime Architecture |
| 2.4.0 | 2026-10-18 | Antigravity AI | Core Dev Team | Executive Leadership | Full 3-Tier Enterprise Auth, Audit Logging & Client Portal |

**Approved by:**  
*Fabulouzz Technologies Technical Operations & Governance Committee*  
*Copyright © 2026 Fabulouzz Technologies. All Rights Reserved.*
