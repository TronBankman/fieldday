# Fieldday — Tron Build Plan

White-label sports management SaaS. BC Falcons Hockey is org #1.
Port proven features from `/Volumes/OpenClaw/projects/falcons/` — don't rebuild from scratch.
Every chunk = one PR. Tests required. Build must pass.

**Priority: This project is ahead of remaining Falcons chunks.**

---

## Chunk 0 — Marketing landing page with interactive feature picker

**Goal:** A polished public landing page at `/` that sells the platform to sports org admins. Visitors can browse all features and check off the ones they care about — then book a demo with their selection pre-filled.

### What to build

**Interactive feature picker:**
- Grid of feature cards, each with a checkbox toggle. Categories:
  - **Registration & Payments** — Online registration form, Stripe payments, installment plans, e-transfer support, credit system
  - **Admin Tools** — Session management, attendance tracking, coach assignments, expense tracking, payment exports
  - **Communication** — Day-before email reminders, bulk email to session registrants, in-app news/announcements
  - **Player & Parent Portal** — Player accounts, RSVP / availability, calendar sync, payment history
  - **Coach Tools** — Coach login, mobile check-in, roster view
  - **Compliance** — Waiver collection and storage
- Selecting features highlights them (gold border, checkmark). Deselecting unchecks.
- Sticky "Book a Demo" CTA button shows count of selected features: "Book a Demo (6 features selected)"

**Hero section:**
- Headline: something like "Run your sports program. Not spreadsheets."
- Sub: Flat monthly fee, no per-transaction platform cuts, works for any sport
- Two CTAs: "See the features" (scrolls to picker) and "Book a Demo"

**Pricing section:**
- Single plan: $149/month, all features included, no setup fee
- List of what's included
- "Start with what you need — add more anytime"

**Demo booking form (update existing `/demo` page):**
- Pre-populate selected features from the picker via URL params (e.g., `?features=registration,payments,reminders`)
- Fields: Org name, sport, your name, email, phone (optional), message
- On submit: save to Supabase `demo_requests` table (create if needed: id, org_name, sport, contact_name, email, phone, features_selected, message, created_at)
- Show confirmation: "We'll be in touch within 1 business day."

**Design:**
- Match existing design tokens (dark bg #0d0d0f, gold #d4af37, card bg #16161a)
- Mobile responsive — feature cards stack to single column on mobile
- Smooth scroll between sections

**Tests:**
- Feature picker renders all features
- Selecting a feature adds it to the selected set; deselecting removes it
- Demo form submits with correct features list in payload
- Demo API route saves to Supabase with all required fields
- Demo API rejects missing email or org_name (400)

**Note:** The product name may change — use a placeholder like `[PRODUCT_NAME]` in all copy so it can be swapped easily when the name is decided.

---

## Chunk 1 — Wire up registration to Supabase + full form

**Goal:** Players can actually register for a session at `/{org}/register`. Right now the form POSTs to an empty URL and the API just logs to console.

### What to build

**Fix the register page (`app/[org]/register/page.tsx`):**
- Change the fetch URL from `""` to `/api/org/register`
- Expand the form to match the Falcons registration form — port from `/Volumes/OpenClaw/projects/falcons/src/app/register/page.tsx`
- Fields: Player Full Name, Parent/Guardian Name, Email, Birth Year, Signup Type, Session (dropdown — fetched from `/api/org/sessions`), Position/Role, Jersey choices, T-Shirt/Sweatshirt size, Comments
- Read the org slug from the URL (`useParams`) and pass it in the request so the middleware can inject `x-fieldday-org-id`

**New API route: `GET /api/org/sessions`**
- Reads `x-fieldday-org-id` from headers (injected by middleware)
- Queries `sessions` table where `org_id = orgId` AND `date >= today`
- Returns `id, name, date, time, location, price, allow_installments, installment_count`
- Used to populate the session dropdown in the registration form

**Wire up `POST /api/org/register` (`app/api/org/register/route.ts`):**
- Replace the `console.log` stub with an actual Supabase insert
- Use the service-role client (from `lib/supabase/server.ts`) — bypasses RLS
- Insert into `registrations` with `org_id` set from the trusted middleware header
- Required fields: `full_name`, `email`, `org_id`, `session_id` (if provided)
- Optional: `phone`, `birth_year`, `signup_type`, `participant_role`, `jersey_1`, `jersey_2`, `jersey_3`, `tshirt_size`, `sweatshirt_size`, `comments`
- Set `paid_status = 'No'`, `approval_status = 'pending'`, `timestamp = now()`
- Generate `id` using the same `makeId('REG')` pattern as Falcons (`lib/id.ts` — create this if needed)
- On success return `{ ok: true, registrationId }`

**Tests:**
- POST with valid body saves to DB (mock Supabase insert, verify called with correct org_id)
- POST without full_name returns 400
- POST without email returns 400
- POST with mismatched org_id in body returns 403 (already tested — keep it)
- GET /api/org/sessions returns only sessions for the correct org

**Do NOT:**
- Touch the Stripe flow yet
- Change the middleware or org routing
- Add auth — registration is still public (approval is the gate)

---

## Chunk 2 — Admin dashboard (port from Falcons)

**Goal:** `/[org]/admin` is a working admin panel. Admins can see registrations, manage sessions, and mark players as approved/paid.

### What to build

**Admin auth:**
- `POST /api/org/admin/login` — accepts `{ password }`, checks against `organizations.admin_password_hash`, returns a JWT with `{ orgId, role: 'admin' }`
- `GET /api/org/admin/me` — verifies token, returns org info
- Use same bcryptjs + jsonwebtoken pattern as Falcons (`lib/auth.ts` — port it)

**Admin page (`app/[org]/admin/page.tsx`):**
- Login gate: if no valid token in localStorage, show a simple password form
- Once authenticated, show tabs (port structure from Falcons `src/app/admin/page.tsx`):
  - **Registrations** — list all registrations for this org, grouped by session. Show name, email, role, paid status, approval status. Approve/reject buttons. Mark paid button.
  - **Sessions** — create/edit sessions. Fields: name, date, time, location, price, spots (forward/defence/goalie/skater), birth year range, allow installments toggle + count.
  - **Payments** — summary: total due, collected, outstanding. List of unpaid registrations.

**API routes needed:**
- `GET /api/org/admin/registrations` — all registrations for org, with session join
- `PATCH /api/org/admin/registrations/[id]` — update approval_status or paid_status
- `POST /api/org/admin/sessions` — create session
- `PATCH /api/org/admin/sessions/[id]` — edit session
- `GET /api/org/admin/payments` — payment summary

All routes: read `x-fieldday-org-id` from headers + verify admin JWT.

**Tests:**
- Admin login with correct password returns token
- Admin login with wrong password returns 401
- Registrations endpoint returns only registrations for the org (not other orgs)
- Approve endpoint updates approval_status
- Sessions endpoint creates session scoped to org

---

## Chunk 3 — Player portal + auth

**Goal:** Players can create an account, log in, and see their registrations — including a Pay Now link for unpaid ones.

### What to build

Port from Falcons:
- `POST /api/org/player/signup` — create player account
- `POST /api/org/player/login` — returns player JWT
- `GET /api/org/player/sessions` — player's registrations, with `amountDue`, `allowInstallments`, `installmentCount` (same fields added to Falcons in PR #29)
- `PATCH /api/org/player/sessions/availability` — RSVP (attending/not_attending/no_response)

**Player portal page (`app/[org]/portal/page.tsx`):**
- Login gate (same pattern as admin)
- Show profile + list of registrations
- Each unpaid registration shows a Pay Now link → `/[org]/checkout?reg=...&amount=...`
- RSVP buttons (Attending / Not Attending / No Response) for upcoming sessions

**Tests:**
- Player login returns token
- Sessions endpoint returns only that player's registrations
- Availability update persists correctly

---

## Chunk 4 — Stripe checkout

**Goal:** Players can pay online. Per-org Stripe Connect or shared account depending on config.

Port the Falcons checkout flow (`src/app/api/checkout/route.ts` and `src/app/payment/checkout/page.tsx`):
- `POST /api/org/checkout` — creates Stripe session, scoped by org
- `app/[org]/checkout/page.tsx` — payment options: Pay in Full, Payment Plan (if enabled and price > $60), Pay Later
- `POST /api/org/webhooks/stripe` — handles `checkout.session.completed`, updates `paid_status` and creates payment record

**Installments:** respect the `allow_installments` and `installment_count` set per session by admin. Do NOT show payment plan for sessions ≤ $60.

**Tests:**
- Checkout rejects deposit plan if session doesn't allow installments
- Checkout rejects deposit plan if amount ≤ $60
- Webhook marks registration as paid on success

---

## Chunk 5 — Email notifications

**Goal:** Players get confirmation emails. Admins get notified of new registrations. Day-before reminders go out automatically.

Port from Falcons:
- Registration confirmation email (Resend)
- Approval email when admin approves
- Day-before session reminder (cron or scheduled API call)

Wire up `/api/demo` to actually save to Supabase (currently also just logging).

---

## Order of operations

Build in this order: **1 → 2 → 3 → 4 → 5**

Rationale:
- Chunk 1 makes the product real — data is actually saved
- Chunk 2 gives admins control — can approve and manage
- Chunk 3 gives players a portal — closes the loop
- Chunk 4 gets money moving
- Chunk 5 makes communication automatic

## Key files to read before starting

- `app/[org]/register/page.tsx` — registration form skeleton (fix the empty fetch URL)
- `app/api/org/register/route.ts` — registration API stub (wire to Supabase)
- `proxy.ts` — middleware that injects `x-fieldday-org-id` and `x-fieldday-org-name`
- `lib/supabase/server.ts` — service-role Supabase client
- `supabase/migrations/001_organizations.sql` — full schema with RLS
- `/Volumes/OpenClaw/projects/falcons/src/app/register/page.tsx` — full form to port
- `/Volumes/OpenClaw/projects/falcons/src/app/api/register/route.ts` — registration logic to port
- `/Volumes/OpenClaw/projects/falcons/src/app/admin/page.tsx` — admin UI to port
- `/Volumes/OpenClaw/projects/falcons/src/app/api/checkout/route.ts` — Stripe logic to port

## Hard constraints

- Every API route reads org_id from `x-fieldday-org-id` header — never from the request body
- Service-role client for all server writes (bypasses RLS safely)
- No secrets in code — SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, JWT_SECRET from env
- Mobile responsive on every page
- All PRs need passing tests before merge
