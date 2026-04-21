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

## Chunk 6 — New-org self-serve onboarding

**Goal:** A prospect can go from "I just clicked the demo link" to "I'm logged into my own admin dashboard" without any manual intervention from us. One form, one redirect to Stripe, back to a working `/[slug]/admin` with sensible defaults.

### What to build

**Signup page (`app/signup/page.tsx`):**
Public, unauthenticated page. Single-column form, same design tokens as the `/demo` page (dark bg, gold accents). Fields:

- **Organization name** (required, 2–80 chars) — free text, e.g. "Oakville Figure Skating Club"
- **URL slug** (required) — lowercase alphanumeric + hyphens, 3–40 chars, matches `/^[a-z0-9-]+$/`. Live preview beside the field: `fieldday.app/your-slug`. Debounced (300ms) availability check against `GET /api/signup/slug-available?slug=...` — shows green check or red "already taken".
- **Owner email** (required, valid email format) — this becomes the admin login identity and the recipient of the password-setup email.
- **Password** (required, min 10 chars) — set inline; avoids an extra email round-trip before the owner sees their dashboard. Bcrypted server-side.
- **Terminology preset** (required, radio group) — `sports` / `fitness` / `dance` / `tutoring`. One-line explanation under each: "Players & Sessions", "Members & Classes", "Dancers & Classes", "Students & Lessons". This drives label substitution across the admin UI (see below).
- Submit CTA: "Create my organization" — disables and shows spinner while the API runs; on success redirects to Stripe Connect onboarding (see below).
- Footer line: "Already have an account? [Log in](...)" linking to `/login` (which we don't have yet — that's fine, link it anyway so we know where it goes).

**Schema changes (new migration `003_org_onboarding.sql`):**
- `alter table public.organizations add column terminology text not null default 'sports';` — one of `sports | fitness | dance | tutoring`. Drives UI labels. Added at `organizations` level because it's a branding decision, not a per-session setting.
- `alter table public.organizations add column owner_email text not null default '';` — the email the org was created with. Used for billing notices and as the initial admin identity. Separate from `contact_email` (which is public-facing).
- `alter table public.organizations add column onboarding_state text not null default 'pending';` — one of `pending | stripe_pending | active`. Drives the welcome banner state on `/[slug]/admin`. Cleared to `active` once the owner completes Stripe onboarding AND dismisses the welcome card.
- `alter table public.organizations add column stripe_onboarding_url text not null default '';` — cached Stripe Express onboarding link (the "complete your payout setup" URL). Regenerated on demand if expired.
- Index on `owner_email` for login lookups.

**New API route: `GET /api/signup/slug-available?slug=<slug>`**
- Public (no auth). Rate-limited via simple in-memory counter (10 reqs/min per IP — optional; fine to defer if it bloats the chunk).
- Validates slug format. If invalid, returns `{ available: false, reason: "invalid_format" }`.
- Queries `organizations` via service-role client. Returns `{ available: true }` or `{ available: false, reason: "taken" }`.
- Also rejects a small reserved list: `['api', 'signup', 'login', 'demo', 'admin', 'www', 'app', 'assets', '_next', 'favicon']` → `{ available: false, reason: "reserved" }`.

**New API route: `POST /api/signup`**
- Public (no auth — this is the signup endpoint).
- Validates all fields server-side. Bail with 400 on any failure (don't trust the client's availability check — recheck slug uniqueness + reserved list at insert time).
- Transaction (or sequenced service-role calls — Supabase doesn't do real transactions via REST, so sequence with rollback-on-failure):
  1. Generate org id via `makeId('ORG')`.
  2. Bcrypt the password (10 rounds, same pattern as existing admin auth).
  3. Insert into `organizations` with `id`, `name`, `slug`, `owner_email`, `terminology`, `admin_password_hash`, `onboarding_state='stripe_pending'`, `sport=''`, `primary_color` defaulted by preset (sports=#0d6efd, fitness=#16a34a, dance=#d946ef, tutoring=#f59e0b).
  4. Create Stripe Express connected account: `stripe.accounts.create({ type: 'express', email, metadata: { org_id, slug } })`. Store returned `account.id` on the org row as `stripe_account_id`.
  5. Create a Stripe Account Link: `stripe.accountLinks.create({ account: account.id, type: 'account_onboarding', refresh_url: '/signup/stripe-refresh?org=<slug>', return_url: '/<slug>/admin?onboarded=1' })`. Store the resulting `url` on the org row as `stripe_onboarding_url`.
  6. Seed default admin scaffolding — see "Seeding" below.
  7. Issue an admin JWT (`{ orgId, role: 'admin' }`) and set it as an httpOnly cookie (`fieldday_admin`) scoped to the slug's future pages. Also return it in the response JSON for the client to stash in localStorage (matching the existing admin login pattern).
- On any step failing after org insert: best-effort cleanup. Log the org id for manual recovery but do NOT delete the row — we want an audit trail. Return a user-facing error and mark `onboarding_state='failed'` so we can surface a "contact support" state if they come back.
- Response: `{ ok: true, orgId, slug, stripeOnboardingUrl, token }`. The client hard-navigates to `stripeOnboardingUrl`.

**New API route: `POST /api/signup/stripe-refresh`**
- Called when Stripe's account link has expired (their `refresh_url` hits this page). Looks up the org by slug, regenerates a fresh Account Link, redirects to it. Must verify the requester owns the session (via the admin cookie set during signup) — do NOT allow an anonymous `?org=<slug>` query to regenerate an onboarding URL for someone else's org.

**Stripe refresh page (`app/signup/stripe-refresh/page.tsx`):**
- Thin wrapper that server-side hits the refresh endpoint and redirects to the fresh Stripe URL. Shows a brief "redirecting to Stripe..." state for UX.

**Seeding default settings:**
On successful org insert, seed the following per-org defaults (all via service-role client, with `org_id` set):
- No sessions, no registrations, no players — the dashboard is genuinely empty, not fake.
- One placeholder team named "Team 1" in the `teams` table — removes the "nothing exists, what do I do" blank state. Owner can rename or delete.
- One placeholder news post: `"Welcome to <org name> on Fieldday"` body: `"This is your first announcement. Edit or delete from the admin dashboard."` — demonstrates the feature without pretending there's real content.
- Terminology map is NOT stored as rows; it's computed from `organizations.terminology` on read. See `lib/terminology.ts` below.

**Terminology module (`lib/terminology.ts`):**
Small pure module — no DB, no side effects. Exports:

```ts
export type Preset = 'sports' | 'fitness' | 'dance' | 'tutoring';
export const terms: Record<Preset, {
  participant: string;    // 'Player' | 'Member' | 'Dancer' | 'Student'
  participants: string;   // plural
  session: string;        // 'Session' | 'Class' | 'Class' | 'Lesson'
  sessions: string;       // plural
  roster: string;         // 'Team' | 'Group' | 'Troupe' | 'Cohort'
}> = { ... };
export function getTerms(preset: string): Terms;  // falls back to 'sports' on unknown
```

Admin pages read `org.terminology` (exposed via the proxy as `x-fieldday-org-terminology` — add this header in `proxy.ts`) and substitute labels. Do NOT rewrite existing pages to use it in this chunk — that's a separate cleanup chunk. Just expose the module and wire it into the welcome banner (below).

**Welcome state on `/[slug]/admin`:**
- When `organizations.onboarding_state !== 'active'`, render a dismissable banner at the top of the admin page:
  - Title: "Welcome to Fieldday, <org name>."
  - Body depends on state:
    - `stripe_pending` and Stripe link is incomplete → "Finish setting up payouts with Stripe so you can accept payments." + button linking to `stripe_onboarding_url`.
    - `stripe_pending` and Stripe account says `charges_enabled=true` (verified via a fresh Stripe `accounts.retrieve`) → auto-advance to `active` server-side and show success message this render.
    - After onboarding → 3-step checklist: "Create your first <session/class/lesson>", "Share your registration link: `fieldday.app/<slug>/register`", "Invite someone to test it". Each has a "Mark done" button; when all three are done, flip `onboarding_state='active'` and stop showing the banner.
- Dismiss button flips `onboarding_state='active'` regardless — we don't force-show the checklist.

**Middleware updates (`proxy.ts`):**
- Add `x-fieldday-org-terminology` and `x-fieldday-org-onboarding-state` to the injected headers so server components can read them without a second query.
- Add `/signup` to `NON_ORG_PREFIXES` so the proxy doesn't try to look up `signup` as an org slug.

### What NOT to build in this chunk

- Password reset flow for owners (separate chunk — no one can lock themselves out yet because they set the password during signup).
- Custom domains (`orgname.com` pointing at `/orgname/...`) — that's a Chunk 7+ concern.
- Team/multi-admin invites — owner is the only admin initially.
- Billing the owner for the $149/mo plan — Stripe Connect here is for the org to collect payments FROM their own players, not for us to charge them. That's a separate SaaS billing chunk.
- Retro-updating existing admin pages to use terminology labels — only the welcome banner uses the module in this chunk.

### Acceptance criteria

A reviewer should be able to verify ALL of these end-to-end in a dev environment with Stripe test mode:

1. Visiting `/signup` renders the form with all fields and preset options.
2. Typing an existing slug (e.g. `bcfalcons`) shows "already taken" within ~500ms of stopping.
3. Typing a reserved slug (e.g. `admin`) shows "reserved — pick another".
4. Submitting with a weak password (< 10 chars) shows an inline error and does NOT hit the API.
5. Submitting with valid inputs hits `POST /api/signup` once and redirects the browser to a `connect.stripe.com/...` URL.
6. In Supabase, the new org row exists with: correct `slug`, hashed password (not plaintext), `terminology` matching the selection, `onboarding_state='stripe_pending'`, a non-empty `stripe_account_id`, and a non-empty `stripe_onboarding_url`.
7. One placeholder team and one placeholder news post exist, both scoped to the new org id.
8. Completing the Stripe Express test-mode flow redirects to `/<slug>/admin?onboarded=1` and the welcome checklist renders.
9. Refreshing `/<slug>/admin` while Stripe is incomplete shows the "finish payouts" banner with a working link.
10. Clicking dismiss on the welcome banner flips `onboarding_state` to `active` in DB and removes the banner on reload.
11. Logging out of admin and logging back in with the signup email + password works (uses existing `/api/org/admin/login` — confirm the inserted hash is compatible).
12. Attempting to create a second org with the same slug returns 400 "slug taken" — no partial row written.

### Test plan (Vitest, colocated under `__tests__/`)

Unit / route tests:
- `signup/slug-available.test.ts` — valid available slug, taken slug, reserved slug, malformed slug.
- `signup/route.test.ts` —
  - Happy path: mocked Supabase + mocked Stripe, assert org row inserted with bcrypted password, Stripe account created with correct metadata, JWT issued.
  - Rejects missing fields (400 each).
  - Rejects weak password (400).
  - Rejects slug taken at insert time (even if availability check passed — race condition).
  - Stripe failure after org insert: org row is marked `onboarding_state='failed'`, response is 500 with user-facing error.
- `signup/stripe-refresh.test.ts` — authorized slug refresh returns a fresh link; unauthorized slug returns 403.
- `lib/terminology.test.ts` — returns correct labels for each preset, falls back to sports on unknown.

Integration test:
- `signup/e2e.test.ts` (mocked Stripe) — POST `/api/signup` with a clean payload; assert: org row exists, placeholder team exists, placeholder news post exists, `stripe_account_id` populated, cookie set on response.

Manual smoke (document in PR description, not automated):
- Full browser walk-through of acceptance criteria 1–11 using Stripe test mode.

### Files to create

- `app/signup/page.tsx` — signup form
- `app/signup/stripe-refresh/page.tsx` — Stripe link refresh redirect
- `app/api/signup/route.ts` — signup POST handler
- `app/api/signup/slug-available/route.ts` — slug availability GET handler
- `app/api/signup/stripe-refresh/route.ts` — Stripe link refresh POST handler
- `lib/terminology.ts` — preset → labels map
- `supabase/migrations/003_org_onboarding.sql` — schema additions
- Component: welcome banner (e.g. `app/[org]/admin/_components/WelcomeBanner.tsx`) wired into `app/[org]/admin/page.tsx`
- Tests for all of the above under `__tests__/`

### Files to modify

- `proxy.ts` — add `/signup` to `NON_ORG_PREFIXES`; inject `x-fieldday-org-terminology` and `x-fieldday-org-onboarding-state` headers
- `app/[org]/admin/page.tsx` — render `<WelcomeBanner />` above existing tabs when onboarding is not complete
- `lib/auth.ts` — (verify only) confirm the JWT issuance pattern used in signup matches the admin login pattern so the same token works for both entry points

### Hard constraints (must not be violated)

- `STRIPE_SECRET_KEY` from env only — never hardcoded, never in logs, never echoed back to the client.
- Password hashed with bcryptjs before insert. Plaintext password must not appear in any log, response, or DB row.
- All DB writes via the service-role client (`lib/supabase/server.ts`). No anon-key writes.
- `org_id` on seeded rows comes from the freshly inserted org — never from the request body.
- Reserved slug list enforced at the API layer, not just client-side.
- PR does not ship without the tests above passing AND a browser walkthrough noted in the PR body (per project rule: no zero-coverage PRs, and visual/flow work requires manual verification).

---

## Order of operations

Build in this order: **1 → 2 → 3 → 4 → 5 → 6**

Rationale:
- Chunk 1 makes the product real — data is actually saved
- Chunk 2 gives admins control — can approve and manage
- Chunk 3 gives players a portal — closes the loop
- Chunk 4 gets money moving
- Chunk 5 makes communication automatic
- Chunk 6 turns Fieldday into a self-serve platform — prospects can onboard without our involvement

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
