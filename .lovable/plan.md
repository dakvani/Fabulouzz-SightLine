

# SightLine Command Center — Subscription-Based SaaS with White-Label Branding

## Summary

Transform SightLine from a single-company tool into a subscription-based project tracking SaaS. Premium users get white-label branding: custom company logo, name, and colors that appear in the app header, project pages, and exported PDF reports.

## Current State

- Single hardcoded brand (Fabulouzz Technologies / SightLine)
- Projects table stores basic metadata (title, client, company name)
- PDF reports use hardcoded Fabulouzz logo and branding
- App header always shows Fabulouzz logo
- No subscription/payment system

## Plan

### 1. Database: Add Company Branding Table

Create a `company_branding` table to store per-user/organization branding:

```sql
CREATE TABLE public.company_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT '',
  logo_url text DEFAULT NULL,
  accent_color text DEFAULT '#4f46e5',
  tagline text DEFAULT '',
  website_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
```

RLS: Users can read/update their own branding. Admins can read all.

### 2. Database: Add Subscription Tier to Profiles

Add a `subscription_tier` column (or a separate `subscriptions` table) to track free vs premium status. For now, a simple approach:

```sql
ALTER TABLE public.profiles ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free';
```

Premium features gated on `subscription_tier = 'premium'`.

### 3. Enable Stripe Payments

Set up Stripe integration for subscription billing with two tiers:
- **Free**: Basic project tracking, default SightLine branding
- **Premium**: Custom branding, PDF exports with company logo, priority features

### 4. Branding Settings Page

New component `BrandingSettings.tsx`:
- Upload company logo (to existing storage bucket or new one)
- Set company name, tagline, accent color, website URL
- Live preview of how header and PDF cover will look
- Only accessible to premium users

### 5. Dynamic App Header

Modify `AppHeader.tsx`:
- If user has custom branding → show their logo and company name instead of Fabulouzz
- Fall back to default SightLine branding for free users or logged-out state
- Load branding from `company_branding` table via context

### 6. Dynamic PDF Export

Modify `generateReportPdf.ts`:
- Accept optional branding object (logo URL, company name, accent color)
- Premium users: cover page shows their company logo and name
- Free users: default SightLine/Fabulouzz branding with "Powered by SightLine" watermark

### 7. Branding Context

Create `BrandingContext.tsx`:
- Fetches current user's branding on login
- Provides branding data to header, PDF export, and other components
- Caches branding to avoid repeated fetches

## Technical Details

- **Storage**: New `company-logos` bucket for uploaded logos
- **Stripe**: Two products — Free (no charge) and Premium (monthly/yearly)
- **Gating**: Check `subscription_tier` before showing branding settings or applying custom branding
- **PDF**: `generateReportPdf` receives a `branding` param; uses custom logo if provided, else defaults

## Implementation Order

1. Database migration (company_branding table + profile tier column)
2. Storage bucket for logos
3. BrandingContext provider
4. BrandingSettings component (UI for managing branding)
5. Update AppHeader to use dynamic branding
6. Update PDF export to use dynamic branding
7. Stripe integration for subscription billing
8. Gate premium features behind subscription check

