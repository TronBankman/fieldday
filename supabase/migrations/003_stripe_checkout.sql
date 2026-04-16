-- ============================================================
-- Fieldday — Stripe Checkout support
-- ============================================================

-- Ensure sessions have installment configuration
alter table public.sessions
  add column if not exists allow_installments boolean not null default false;

alter table public.sessions
  add column if not exists installment_count integer not null default 3;

-- Ensure registrations have payment_method
alter table public.registrations
  add column if not exists payment_method text not null default '';

-- Ensure payments table has stripe_session_id
alter table public.payments
  add column if not exists stripe_session_id text not null default '';

-- Index for webhook lookups by stripe_session_id
create index if not exists idx_payments_stripe_session_id
  on public.payments (stripe_session_id)
  where stripe_session_id != '';
