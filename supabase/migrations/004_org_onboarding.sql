-- ============================================================
-- Field Day — Org onboarding columns (Chunk 6)
-- ============================================================
-- Adds columns needed for self-serve org signup: terminology
-- preset, owner email, onboarding state, and Stripe onboarding URL.
-- stripe_account_id already exists from Chunk 4 (001_init.sql).
-- ============================================================

alter table public.organizations
  add column if not exists terminology text not null default 'sports';
  -- one of: sports | fitness | dance | tutoring
  -- Drives UI label substitution via lib/terminology.ts presets.

alter table public.organizations
  add column if not exists owner_email text not null default '';
  -- Email the org was created with. Billing notices + initial admin identity.
  -- Separate from contact_email (which is public-facing).

alter table public.organizations
  add column if not exists onboarding_state text not null default 'pending';
  -- one of: pending | stripe_pending | active | failed
  -- Drives welcome banner visibility.

alter table public.organizations
  add column if not exists stripe_onboarding_url text not null default '';
  -- Cached Stripe Express onboarding link. Regenerated on demand when expired.

create index if not exists idx_organizations_owner_email
  on public.organizations(owner_email);
