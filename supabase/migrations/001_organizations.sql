-- ============================================================
-- Fieldday — Phase 2: Multi-org schema
-- ============================================================

-- Organizations table
create table if not exists public.organizations (
  id           text primary key,
  name         text not null,
  slug         text not null unique,
  sport        text not null default '',
  primary_color text not null default '#000000',
  logo_url     text not null default '',
  stripe_account_id text not null default '',
  contact_email text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists idx_organizations_slug on public.organizations (slug);

-- ============================================================
-- Add org_id to all existing Falcons tables
-- ============================================================

alter table public.sessions
  add column if not exists org_id text not null default '';

alter table public.registrations
  add column if not exists org_id text not null default '';

alter table public.news_posts
  add column if not exists org_id text not null default '';

alter table public.teams
  add column if not exists org_id text not null default '';

alter table public.team_players
  add column if not exists org_id text not null default '';

alter table public.payments
  add column if not exists org_id text not null default '';

alter table public.payment_plans
  add column if not exists org_id text not null default '';

alter table public.credits
  add column if not exists org_id text not null default '';

alter table public.admin_tasks
  add column if not exists org_id text not null default '';

alter table public.players
  add column if not exists org_id text not null default '';

alter table public.team_messages
  add column if not exists org_id text not null default '';

alter table public.player_notes
  add column if not exists org_id text not null default '';

alter table public.coaches
  add column if not exists org_id text not null default '';

alter table public.session_coaches
  add column if not exists org_id text not null default '';

alter table public.expenses
  add column if not exists org_id text not null default '';

alter table public.team_games
  add column if not exists org_id text not null default '';

-- Indexes on org_id for all tables
create index if not exists idx_sessions_org_id         on public.sessions (org_id);
create index if not exists idx_registrations_org_id    on public.registrations (org_id);
create index if not exists idx_news_posts_org_id       on public.news_posts (org_id);
create index if not exists idx_teams_org_id            on public.teams (org_id);
create index if not exists idx_team_players_org_id     on public.team_players (org_id);
create index if not exists idx_payments_org_id         on public.payments (org_id);
create index if not exists idx_payment_plans_org_id    on public.payment_plans (org_id);
create index if not exists idx_credits_org_id          on public.credits (org_id);
create index if not exists idx_admin_tasks_org_id      on public.admin_tasks (org_id);
create index if not exists idx_players_org_id          on public.players (org_id);
create index if not exists idx_team_messages_org_id    on public.team_messages (org_id);
create index if not exists idx_player_notes_org_id     on public.player_notes (org_id);
create index if not exists idx_coaches_org_id          on public.coaches (org_id);
create index if not exists idx_session_coaches_org_id  on public.session_coaches (org_id);
create index if not exists idx_expenses_org_id         on public.expenses (org_id);
create index if not exists idx_team_games_org_id       on public.team_games (org_id);

-- ============================================================
-- Row-Level Security: orgs see only their own data
-- ============================================================

alter table public.organizations    enable row level security;
alter table public.sessions         enable row level security;
alter table public.registrations    enable row level security;
alter table public.news_posts       enable row level security;
alter table public.teams            enable row level security;
alter table public.team_players     enable row level security;
alter table public.payments         enable row level security;
alter table public.payment_plans    enable row level security;
alter table public.credits          enable row level security;
alter table public.admin_tasks      enable row level security;
alter table public.players          enable row level security;
alter table public.team_messages    enable row level security;
alter table public.player_notes     enable row level security;
alter table public.coaches          enable row level security;
alter table public.session_coaches  enable row level security;
alter table public.expenses         enable row level security;
alter table public.team_games       enable row level security;

-- Service role bypasses RLS (used server-side with service key).
-- Anon/authenticated clients are restricted to their org.
-- The app passes org_id via a claim set in the JWT or via a
-- Postgres session variable: set_config('app.org_id', $1, true).

-- Helper: get the current org_id from session config
create or replace function public.current_org_id()
  returns text
  language sql stable
  as $$
    select current_setting('app.org_id', true);
  $$;

-- Organizations: any authed user can read their own org row
create policy "org_select" on public.organizations
  for select using (id = public.current_org_id());

-- Macro to DRY up per-table RLS policies
-- (PostgreSQL doesn't support macros, so we repeat the pattern)

create policy "sessions_select" on public.sessions
  for select using (org_id = public.current_org_id());
create policy "sessions_insert" on public.sessions
  for insert with check (org_id = public.current_org_id());
create policy "sessions_update" on public.sessions
  for update using (org_id = public.current_org_id());
create policy "sessions_delete" on public.sessions
  for delete using (org_id = public.current_org_id());

create policy "registrations_select" on public.registrations
  for select using (org_id = public.current_org_id());
create policy "registrations_insert" on public.registrations
  for insert with check (org_id = public.current_org_id());
create policy "registrations_update" on public.registrations
  for update using (org_id = public.current_org_id());
create policy "registrations_delete" on public.registrations
  for delete using (org_id = public.current_org_id());

create policy "news_posts_select" on public.news_posts
  for select using (org_id = public.current_org_id());
create policy "news_posts_insert" on public.news_posts
  for insert with check (org_id = public.current_org_id());
create policy "news_posts_update" on public.news_posts
  for update using (org_id = public.current_org_id());
create policy "news_posts_delete" on public.news_posts
  for delete using (org_id = public.current_org_id());

create policy "teams_select" on public.teams
  for select using (org_id = public.current_org_id());
create policy "teams_insert" on public.teams
  for insert with check (org_id = public.current_org_id());
create policy "teams_update" on public.teams
  for update using (org_id = public.current_org_id());
create policy "teams_delete" on public.teams
  for delete using (org_id = public.current_org_id());

create policy "team_players_select" on public.team_players
  for select using (org_id = public.current_org_id());
create policy "team_players_insert" on public.team_players
  for insert with check (org_id = public.current_org_id());
create policy "team_players_update" on public.team_players
  for update using (org_id = public.current_org_id());
create policy "team_players_delete" on public.team_players
  for delete using (org_id = public.current_org_id());

create policy "payments_select" on public.payments
  for select using (org_id = public.current_org_id());
create policy "payments_insert" on public.payments
  for insert with check (org_id = public.current_org_id());
create policy "payments_update" on public.payments
  for update using (org_id = public.current_org_id());

create policy "payment_plans_select" on public.payment_plans
  for select using (org_id = public.current_org_id());
create policy "payment_plans_insert" on public.payment_plans
  for insert with check (org_id = public.current_org_id());
create policy "payment_plans_update" on public.payment_plans
  for update using (org_id = public.current_org_id());

create policy "credits_select" on public.credits
  for select using (org_id = public.current_org_id());
create policy "credits_insert" on public.credits
  for insert with check (org_id = public.current_org_id());
create policy "credits_update" on public.credits
  for update using (org_id = public.current_org_id());

create policy "admin_tasks_select" on public.admin_tasks
  for select using (org_id = public.current_org_id());
create policy "admin_tasks_insert" on public.admin_tasks
  for insert with check (org_id = public.current_org_id());
create policy "admin_tasks_update" on public.admin_tasks
  for update using (org_id = public.current_org_id());
create policy "admin_tasks_delete" on public.admin_tasks
  for delete using (org_id = public.current_org_id());

create policy "players_select" on public.players
  for select using (org_id = public.current_org_id());
create policy "players_insert" on public.players
  for insert with check (org_id = public.current_org_id());
create policy "players_update" on public.players
  for update using (org_id = public.current_org_id());

create policy "team_messages_select" on public.team_messages
  for select using (org_id = public.current_org_id());
create policy "team_messages_insert" on public.team_messages
  for insert with check (org_id = public.current_org_id());

create policy "player_notes_select" on public.player_notes
  for select using (org_id = public.current_org_id());
create policy "player_notes_insert" on public.player_notes
  for insert with check (org_id = public.current_org_id());
create policy "player_notes_update" on public.player_notes
  for update using (org_id = public.current_org_id());

create policy "coaches_select" on public.coaches
  for select using (org_id = public.current_org_id());
create policy "coaches_insert" on public.coaches
  for insert with check (org_id = public.current_org_id());
create policy "coaches_update" on public.coaches
  for update using (org_id = public.current_org_id());

create policy "session_coaches_select" on public.session_coaches
  for select using (org_id = public.current_org_id());
create policy "session_coaches_insert" on public.session_coaches
  for insert with check (org_id = public.current_org_id());
create policy "session_coaches_update" on public.session_coaches
  for update using (org_id = public.current_org_id());

create policy "expenses_select" on public.expenses
  for select using (org_id = public.current_org_id());
create policy "expenses_insert" on public.expenses
  for insert with check (org_id = public.current_org_id());
create policy "expenses_update" on public.expenses
  for update using (org_id = public.current_org_id());
create policy "expenses_delete" on public.expenses
  for delete using (org_id = public.current_org_id());

create policy "team_games_select" on public.team_games
  for select using (org_id = public.current_org_id());
create policy "team_games_insert" on public.team_games
  for insert with check (org_id = public.current_org_id());
create policy "team_games_update" on public.team_games
  for update using (org_id = public.current_org_id());
create policy "team_games_delete" on public.team_games
  for delete using (org_id = public.current_org_id());

-- ============================================================
-- Seed: BC Falcons demo org
-- ============================================================
insert into public.organizations (id, name, slug, sport, primary_color, contact_email)
values (
  'org_bcfalcons',
  'BC Falcons Hockey',
  'bcfalcons',
  'hockey',
  '#cc0000',
  'admin@bcfalcons.com'
)
on conflict (slug) do nothing;
