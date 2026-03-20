# Project: Fieldday

## Overview
Fieldday is a white-label sports organization management SaaS. It lets youth sports organizations (hockey, soccer, lacrosse, etc.) run their programs without spreadsheets — online registration, Stripe payments, scheduling, attendance, coach management, and parent communication. Flat $149/month, no per-transaction platform fees.

BC Falcons Hockey (bcfalcons.com) is customer #1 and the proof-of-concept this platform was built from.

## Mode: Lead
OpenClaw owns this project end-to-end.

## Stack
- **Framework:** Next.js (App Router) — Next.js 16 / React 19
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL) — Phase 2
- **Payments:** Stripe — Phase 2
- **Styling:** Tailwind CSS v4
- **Auth:** bcryptjs + jsonwebtoken (custom) — Phase 2
- **Deployment:** Vercel (planned)

## Current Phase
Building — Phase 1 complete (marketing landing page + demo form).

## App Structure (Phase 1)
- `/app/page.tsx` — Marketing landing page
- `/app/layout.tsx` — Root layout with metadata
- `/app/globals.css` — Design tokens and global styles
- `/app/demo/page.tsx` — Demo booking form
- `/app/api/demo/route.ts` — Demo form API endpoint (logs to console; wire up Resend or Supabase in Phase 2)

## Design System
- Background: `#0d0d0f` with radial gradient accents
- Gold accent: `#d4af37` / `#e8c84a` (hover)
- Red accent: `#e51b24`
- Muted text: `#a8aab0`
- Card bg: `#16161a`
- Border: `#2e2e36`
- Font: System font stack (no Google Fonts dependency in Phase 1)

## Phase 2 Plan — Multi-org infrastructure
1. Each org gets a slug or subdomain (e.g., fieldday.app/org/bcfalcons)
2. `organizations` table: name, slug, sport, logo_url, primary_color, stripe_account_id, admin_password_hash
3. All bcfalcons-specific content becomes org-configurable
4. Admin panel namespaced per org at /admin
5. Migrate bcfalcons.com codebase features from `/Volumes/OpenClaw/projects/falcons/`

## Source of Truth — bcfalcons.com
The full-featured codebase lives at `/Volumes/OpenClaw/projects/falcons/`. When building Phase 2 features, port them from there rather than starting from scratch. Key features already built there:
- Player registration flow
- Stripe checkout (full + installment plans)
- Admin dashboard (sessions, teams, coaches, news, financials, credits)
- Team schedule management
- Coach hours + expense tracking
- Player portal (profile, approval, availability, chat, calendar sync)
- Password reset (Resend magic links)
- Bulk email to session registrants
- Payment CSV export

## Git Workflow
- Never push directly to main
- Create feature branches, push, open PR to main
- Owner merges — never merge PRs yourself

## Testing Standards
- Every PR needs tests. No exceptions.
- `npm run build` must pass before any PR.
- API routes must be tested with at least happy path + validation error cases.

## Important Rules
- No hardcoded secrets. Use environment variables.
- No inline styles — Tailwind only.
- Mobile responsive on every page.
- No placeholder images — use CSS/SVG shapes.
