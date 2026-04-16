-- ============================================================
-- Fieldday — demo_requests table
-- Captures demo booking form submissions from the landing page
-- ============================================================

create table if not exists public.demo_requests (
  id           text primary key,
  name         text not null,
  org          text not null,
  email        text not null,
  sport        text not null,
  current_tool text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists idx_demo_requests_email on public.demo_requests (email);
create index if not exists idx_demo_requests_created_at on public.demo_requests (created_at desc);

-- RLS: service role only (no public reads)
alter table public.demo_requests enable row level security;
