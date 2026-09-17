-- ============================================================
-- Field Day — funnel_events: landing-page conversion funnel
-- ============================================================
-- Captures page views, form starts, and submit outcomes so we
-- can see where prospects drop off in the demo booking flow.
-- session_id is generated client-side (random uuid in localStorage)
-- so a single visitor's events thread together without auth.

create table if not exists public.funnel_events (
  id          bigserial primary key,
  session_id  text not null,
  event_type  text not null,
  path        text not null default '',
  referrer    text not null default '',
  user_agent  text not null default '',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_funnel_events_session_id
  on public.funnel_events (session_id);

create index if not exists idx_funnel_events_event_type_created
  on public.funnel_events (event_type, created_at desc);

create index if not exists idx_funnel_events_created_at
  on public.funnel_events (created_at desc);
