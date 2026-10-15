# Antigravity Standards & Architecture Guidelines for Fabulouzz SightLine

## Overview
Fabulouzz SightLine is an enterprise-grade Command Center and Real-Time Project Monitoring SaaS platform built for high-reliability engineering, EPC projects, and executive reporting.

## Architectural Standards
1. **Frontend Core**:
   - React 18 with TypeScript 5 strict mode.
   - Vite 5 with SWC compilation.
   - TanStack Query v5 for server state.
   - Context API for app-wide reactive state (`ProjectDataContext`, `BrandingContext`).

2. **Styling & Design System**:
   - Tailwind CSS with semantic HSL variables.
   - Neuropol X Free typography for command-deck headers.
   - Glassmorphism surfaces (`glass-card`, `glow-border`).
   - Corporate Accent: Fabulouzz Emerald `#2fbf2f` (HSL `120, 60%, 47%`).
   - Dark/Light theme consistency with radix-ui primitives and Lucide icons.

3. **Data Schema & Scope Management**:
   - Deliverable Scopes consist of:
     - `name`: Short, concise scope title (e.g. "Design & Site Plan") - optimized for single-line alignment on dashboard timelines and Gantt charts.
     - `description`: Detailed specifications, material requirements, and engineering instructions.
   - When managing scopes, dual-table or structured tabular views allow viewing and editing both Scope of Work and Description without sacrificing layout clarity.
   - In PDF exports, both Scope of Work and Description are formatted in cleanly aligned auto-wrapping tables.

4. **Email System & Branding Policy**:
   - Official communications originate from: `info@fabulouzz.com`.
   - Reply-To: `info@fabulouzz.com`.
   - All email templates MUST feature official Fabulouzz Technologies branding, corporate logo, Neuropol styling, and "Provided by Fabulouzz Technologies" attribution.
   - No emails should ever route through third-party platform default mailers (e.g. Lovable). Direct dispatch via Resend or Supabase Edge Functions with `info@fabulouzz.com` is required.
