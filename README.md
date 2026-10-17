# Fabulouzz SightLine — Command Center & Project Monitoring SaaS

**Fabulouzz SightLine** is a modern, real-time project monitoring, intelligent task tracking, and white-label operations platform built for engineering teams, contractors, and client stakeholders.

---

## 🌟 Core Features

- **Multi-Project Management**: Switch seamlessly between client installations, track progress percentages, milestones, and deliverables.
- **Interactive Gantt & Kanban Views**: Visual timeline with milestone dependencies, drag-and-drop task workflows, and status tracking (`Planning`, `Initiating`, `Processing`, `Completed`).
- **Real-Time Synchronisation**: Powered by Supabase Postgres Realtime for instant task status, notifications, and site updates.
- **Automated Weather Telemetry**: Integrated Open-Meteo site weather and 3-day forecast widget based on project location.
- **Automated PDF Reports**: High-fidelity PDF report generation (`jspdf` + `jspdf-autotable`) with customizable branding and cover pages.
- **White-Label Branding (SaaS)**: Custom logo, company name, custom primary accent colors, and custom cover letterheads.
- **Stripe Billing Integration**: Tiered access (`free` vs `premium`) with customer portal and checkout sessions.
- **Security & Access Control**: Supabase Auth with granular Row Level Security (RLS) policies and password reset flows.

---

## 🛠️ Tech Stack

- **Frontend Core**: React 18, TypeScript 5, Vite 5
- **Styling & UI**: Tailwind CSS, shadcn/ui (Radix UI primitives), Lucide React icons, Framer Motion
- **Data & State**: TanStack React Query v5, Context API
- **Backend / Database**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Reporting**: jsPDF, jsPDF-AutoTable
- **Testing**: Vitest, React Testing Library, JSDOM

---

## 🔌 Port Allocation Policy

To avoid port collisions across local infrastructure services:
- **SightLine (Local Dev & Preview)**: Port `8080` (or `8085+`)
- **Reserved Ports (DO NOT ALLOCATE)**:
  - `3000`: HRMS
  - `3100`: WHM
  - `8069`: Odoo ERP

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js `v18+` or `v20+` (Tested on Node `v24.x`)
- npm `v9+` or `v11+`

### 2. Environment Setup
Copy the environment template and configure your Supabase project keys:

```bash
cp .env.example .env
```

Ensure `.env` contains:
```env
VITE_SUPABASE_PROJECT_ID=dxohbmgalsxswmpptyqy
VITE_SUPABASE_URL=https://dxohbmgalsxswmpptyqy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_publishable_key
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
The application will be accessible at: `http://localhost:8080`

---

## 📋 Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `vite` | Starts local Vite development server on port `8080` |
| `npm run build` | `vite build` | Compiles optimized production bundle in `dist/` |
| `npm run preview` | `vite preview` | Runs local HTTP server serving the production `dist/` on port `8080` |
| `npm run lint` | `eslint .` | Runs ESLint analysis |
| `npm run test` | `vitest run` | Executes unit test suite once |
| `npm run test:watch` | `vitest` | Runs tests in interactive watch mode |
| `npm run service:status` | `powershell ...` | Checks if SightLine is running and verifies 200 OK health |
| `npm run service:stop` | `powershell ...` | Stops any active process running on port `8080` |
| `npm run service:install-autostart` | `powershell ...` | Registers Windows Startup shortcut and Scheduled Task for automatic launch on reboot |
| `npm run service:uninstall-autostart` | `powershell ...` | Removes all autostart entries |

---

## 🔄 Always-On & Reboot Persistence (Windows)

SightLine is configured to automatically launch upon Windows startup/reboot so your project command center is always running:

- **Automatic Startup**: Configured via both **Windows Startup Shortcut** (`shell:startup`) and **Windows Task Scheduler** (`FabulouzzSightLine`).
- **Silent Background Execution**: Runs via `scripts/start-sightline-silent.vbs` without keeping intrusive console windows open.
- **Port**: Bound to `http://localhost:8080` with Hot Module Reloading (HMR) active for ongoing development.
- **Check Status**: `npm run service:status`
- **Stop Service**: `npm run service:stop`
- **Re-install / Uninstall**: `npm run service:install-autostart` / `npm run service:uninstall-autostart`

---

## 🏗️ Google Antigravity Architectural Standards

The codebase has been refactored and standardized from Lovable conventions to **Google Antigravity Engineering Standards**:
- **Zero Vendor Lock-in**: All proprietary Lovable hooks, taggers, and platform-specific artifacts have been eradicated.
- **Resilient Offline-First Fallbacks**: Dynamic database schema features (such as `tasks.description`) operate seamlessly even if backend migrations have not yet run, using smart local persistence caches (`sightline_task_descriptions`).
- **High-Fidelity Code Quality**: Enforced strict TypeScript typings, comprehensive Vitest unit suites, and zero-error builds.
- **Architectural Rules**: Formalized under [`.agents/rules/antigravity.md`](file:///.agents/rules/antigravity.md).

---

## ✉️ Official Email Dispatching (`info@fabulouzz.com`)

All system notifications, project alerts, and password resets originate exclusively from **`info@fabulouzz.com`** with complete Fabulouzz corporate branding:
- **Zero Lovable Relaying**: Default Supabase Auth SMTP routing through third-party platform mailers has been fully bypassed.
- **Dual-Layer Delivery Pipeline**:
  1. **Primary**: Supabase Edge Function (`supabase/functions/send-email`) configured with official Resend API keys.
  2. **Direct Client Fallback**: Client-side Resend API dispatch (`VITE_RESEND_API_KEY`) ensuring guaranteed delivery if edge functions are offline.
- **Corporate Branding**:
  - Sender: `SIGHTLINE Command Center <info@fabulouzz.com>`
  - Reply-To: `info@fabulouzz.com`
  - Visuals: Dark-mode container, official Fabulouzz logo, `#2fbf2f` emerald status accents, Neuropol X Free typography, and footer signature: *"Provided by Fabulouzz Technologies"*.

---

## 📑 Dual-Table Project Scope & Deliverables Architecture

Project task and deliverable management is structured into two dedicated tables:

### 1. Scope of the Work & Deliverable Descriptions
- **Scope of the Work**: Short, concise deliverable title (e.g. `Camera Re-alignment`, `NVR Firmware Upgrade`).
- **Description**: In-depth technical specifications, exact model numbers, conduit requirements, and acceptance criteria.
- **Dashboard Timeline Display**: On the timeline Gantt chart, **only the short Scope of Work title is displayed** with strict single-line truncation. Full descriptions are accessible on hover via interactive tooltips, preserving perfect vertical alignment with the timeline calendar.
- **Comprehensive PDF Reporting**: When generating the official project PDF report (`generateReportPdf.ts`), both **Scope of the Work** and **Detailed Descriptions** are aligned in a professional, multi-column WBS tabular matrix.

### 2. Execution Schedule & Durations
- Focuses strictly on scheduling, date ranges (`Planned Dates`), working day durations, predecessor dependencies, and status updates.

---

## 📦 Production Deployment & Docker Readiness

The production build generates clean static assets in `dist/`. You can serve them using:
- Any static hosting (Vercel, Netlify, Cloudflare Pages, AWS S3 + CloudFront)
- Nginx / Caddy container:
  ```nginx
  server {
      listen 8080;
      server_name localhost;
      root /usr/share/nginx/html;
      index index.html;
      location / {
          try_files $uri $uri/ /index.html;
      }
  }
  ```

---

## 📚 Documentation & Legal Registry

Comprehensive enterprise manuals and legal copyright documents are cataloged in the [`docs/`](docs/) directory:

- 📖 **[Administrator Manual (`docs/ADMIN_MANUAL.md`)](docs/ADMIN_MANUAL.md)**: Operational guide for Super Admins and Admins covering the 3-tier RBAC system, user provisioning, project assignments, client portal administration, security policies, audit logging, and disaster recovery SOPs.
- 📜 **[Certificate of Copyright Registration (`docs/COPYRIGHT_CERTIFICATE.md`)](docs/COPYRIGHT_CERTIFICATE.md)**: Official intellectual property title, registration metadata (TX-9-482-108-SL-2026), international convention protections, and cryptographic SHA-256 genesis fingerprint.
- 🖨️ **[Print-Ready Visual Certificate (`docs/COPYRIGHT_CERTIFICATE.html`)](docs/COPYRIGHT_CERTIFICATE.html)**: High-resolution, ornate gold-seal certificate suitable for browser preview, framing, or instant PDF export.
- ⚖️ **[Proprietary Software License & IP Policy (`docs/LICENSE_AND_IP_POLICY.md`)](docs/LICENSE_AND_IP_POLICY.md)**: Commercial enterprise license terms, trade secret declarations, usage boundaries, data ownership, and legal liabilities.

---

## 🛡️ License & Ownership

Copyright © 2026 **Fabulouzz Technologies / DVHQ Innovations**. All rights reserved.  
Protected under the Berne Convention, WIPO Copyright Treaty, and international proprietary software laws.
