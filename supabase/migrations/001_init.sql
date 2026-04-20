-- ============================================================
-- Field Day — Complete multi-org schema (fresh install)
-- ============================================================

-- Organizations
create table if not exists public.organizations (
  id                  text primary key,
  name                text not null,
  slug                text not null unique,
  sport               text not null default '',
  primary_color       text not null default '#000000',
  logo_url            text not null default '',
  stripe_account_id   text not null default '',
  contact_email       text not null default '',
  admin_password_hash text not null default '',
  created_at          timestamptz not null default now()
);

create index if not exists idx_organizations_slug on public.organizations (slug);

-- Sessions
create table if not exists public.sessions (
  id                 text primary key,
  org_id             text not null default '',
  name               text not null,
  date               text not null,
  time               text not null,
  location           text not null,
  program            text not null default '',
  spots              integer not null default 0,
  birth_year_min     integer not null default 0,
  birth_year_max     integer not null default 0,
  forward_spots      integer not null default 0,
  defence_spots      integer not null default 0,
  skater_spots       integer not null default 0,
  goalie_spots       integer not null default 0,
  price              integer not null default 0,
  description        text not null default '',
  team_id            text not null default '',
  open_to_public     boolean not null default false,
  duration_minutes   integer not null default 60,
  allow_installments boolean not null default false,
  installment_count  integer not null default 3,
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

create index if not exists idx_sessions_org_id on public.sessions (org_id);
create index if not exists idx_sessions_active_date_time on public.sessions (active, date, time);
create index if not exists idx_sessions_team_id on public.sessions (team_id);

-- Registrations
create table if not exists public.registrations (
  id                             text primary key,
  org_id                         text not null default '',
  timestamp                      timestamptz not null default now(),
  full_name                      text not null,
  email                          text not null,
  phone                          text not null default '',
  birth_year                     text not null default '',
  guardian_name                  text not null default '',
  signup_type                    text not null default '',
  participant_role               text not null default '',
  session_id                     text not null default '',
  session_name                   text not null default '',
  session_birth_year_eligibility text not null default '',
  last_team_played               text not null default '',
  last_level_played              text not null default '',
  jersey_1                       text not null default '',
  jersey_2                       text not null default '',
  jersey_3                       text not null default '',
  tshirt_size                    text not null default '',
  sweatshirt_size                text not null default '',
  comments                       text not null default '',
  player_id                      text not null default '',
  team_interest                  text not null default '',
  amount_due                     integer not null default 0,
  amount_paid                    integer not null default 0,
  paid_status                    text not null default 'No',
  approval_status                text not null default 'pending',
  availability                   text not null default 'no_response',
  payment_method                 text not null default '',
  credit_applied                 integer not null default 0,
  commitment_type                text not null default '',
  request_call                   boolean not null default false,
  notes                          text not null default ''
);

create index if not exists idx_registrations_org_id on public.registrations (org_id);
create index if not exists idx_registrations_timestamp on public.registrations (timestamp desc);
create index if not exists idx_registrations_player_id on public.registrations (player_id);
create index if not exists idx_registrations_email on public.registrations (email);
create index if not exists idx_registrations_approval_status on public.registrations (approval_status);

-- Players
create table if not exists public.players (
  id                  text primary key,
  org_id              text not null default '',
  email               text not null,
  password_hash       text not null,
  full_name           text not null,
  phone               text not null default '',
  birth_year          text not null default '',
  guardian_name       text not null default '',
  participant_role    text not null default '',
  last_team_played    text not null default '',
  last_level_played   text not null default '',
  jersey_number_1     text not null default '',
  jersey_number_2     text not null default '',
  jersey_number_3     text not null default '',
  jersey_size         text not null default '',
  tshirt_size         text not null default '',
  sweatshirt_size     text not null default '',
  commitment_type     text not null default '',
  team_interest       text not null default '',
  calendar_token      text not null default '',
  reset_token         text,
  reset_token_expires timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists idx_players_org_id on public.players (org_id);
create index if not exists idx_players_email on public.players (email);
create index if not exists idx_players_calendar_token on public.players (calendar_token);
create index if not exists idx_players_reset_token on public.players (reset_token);

-- Teams
create table if not exists public.teams (
  id         text primary key,
  org_id     text not null default '',
  name       text not null,
  season     text not null default '',
  program    text not null default '',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_teams_org_id on public.teams (org_id);
create index if not exists idx_teams_active_created_at on public.teams (active, created_at desc);

-- Team Players
create table if not exists public.team_players (
  id          text primary key,
  org_id      text not null default '',
  team_id     text not null,
  full_name   text not null,
  email       text not null,
  birth_year  text not null default '',
  position    text not null default '',
  player_type text not null default 'Full Time',
  player_id   text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_team_players_org_id on public.team_players (org_id);
create index if not exists idx_team_players_team_id_created_at on public.team_players (team_id, created_at desc);
create index if not exists idx_team_players_email on public.team_players (email);
create index if not exists idx_team_players_player_id on public.team_players (player_id);

-- Payments
create table if not exists public.payments (
  id                text primary key,
  org_id            text not null default '',
  registration_id   text not null,
  amount            integer not null,
  method            text not null default 'stripe',
  status            text not null default 'pending',
  stripe_session_id text not null default '',
  notes             text not null default '',
  created_at        timestamptz not null default now()
);

create index if not exists idx_payments_org_id on public.payments (org_id);
create index if not exists idx_payments_registration_id on public.payments (registration_id);
create index if not exists idx_payments_stripe_session_id
  on public.payments (stripe_session_id)
  where stripe_session_id != '';

-- Payment Plans
create table if not exists public.payment_plans (
  id                text primary key,
  org_id            text not null default '',
  registration_id   text not null,
  total_amount      integer not null,
  deposit_amount    integer not null,
  num_installments  integer not null default 2,
  installments_paid integer not null default 0,
  next_due_date     text not null default '',
  status            text not null default 'active',
  created_at        timestamptz not null default now()
);

create index if not exists idx_payment_plans_org_id on public.payment_plans (org_id);
create index if not exists idx_payment_plans_registration_id on public.payment_plans (registration_id);

-- Credits
create table if not exists public.credits (
  id                       text primary key,
  org_id                   text not null default '',
  player_email             text not null,
  amount                   integer not null,
  reason                   text not null default '',
  issued_by                text not null default '',
  redeemed                 boolean not null default false,
  redeemed_registration_id text not null default '',
  created_at               timestamptz not null default now()
);

create index if not exists idx_credits_org_id on public.credits (org_id);
create index if not exists idx_credits_player_email on public.credits (player_email);

-- Admin Tasks
create table if not exists public.admin_tasks (
  id          text primary key,
  org_id      text not null default '',
  title       text not null,
  description text not null default '',
  assigned_to text not null default '',
  status      text not null default 'todo',
  due_date    text not null default '',
  created_by  text not null default 'admin',
  created_at  timestamptz not null default now()
);

create index if not exists idx_admin_tasks_org_id on public.admin_tasks (org_id);

-- News Posts
create table if not exists public.news_posts (
  id           text primary key,
  org_id       text not null default '',
  title        text not null,
  body         text not null,
  image_url    text not null default '',
  publish_date date not null default current_date,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_news_posts_org_id on public.news_posts (org_id);
create index if not exists idx_news_publish_date_created_at on public.news_posts (publish_date desc, created_at desc);

-- Coaches
create table if not exists public.coaches (
  id          text primary key,
  org_id      text not null default '',
  name        text not null,
  hourly_rate integer not null default 0,
  game_rate   integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_coaches_org_id on public.coaches (org_id);
create index if not exists idx_coaches_active on public.coaches (active, created_at desc);

-- Session Coaches
create table if not exists public.session_coaches (
  id         text primary key,
  org_id     text not null default '',
  session_id text not null,
  coach_id   text not null,
  hours      numeric(6,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_session_coaches_org_id on public.session_coaches (org_id);
create index if not exists idx_session_coaches_session_id on public.session_coaches (session_id);
create index if not exists idx_session_coaches_coach_id on public.session_coaches (coach_id);

-- Expenses
create table if not exists public.expenses (
  id          text primary key,
  org_id      text not null default '',
  description text not null,
  amount      integer not null,
  category    text not null default '',
  date        text not null,
  session_id  text not null default '',
  team_id     text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists idx_expenses_org_id on public.expenses (org_id);
create index if not exists idx_expenses_date on public.expenses (date desc);
create index if not exists idx_expenses_session_id on public.expenses (session_id);
create index if not exists idx_expenses_team_id on public.expenses (team_id);

-- Team Games
create table if not exists public.team_games (
  id         text primary key,
  org_id     text not null default '',
  team_id    text not null,
  type       text not null default 'game',
  date       text not null,
  end_date   text not null default '',
  time       text not null default '',
  opponent   text not null default '',
  location   text not null default '',
  home_away  text not null default 'home',
  score_us   integer,
  score_them integer,
  session_id text not null default '',
  notes      text not null default '',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_team_games_org_id on public.team_games (org_id);
create index if not exists idx_team_games_team_id on public.team_games (team_id);

-- Team Messages
create table if not exists public.team_messages (
  id           text primary key,
  org_id       text not null default '',
  team_id      text not null,
  player_email text not null,
  player_name  text not null,
  content      text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_team_messages_org_id on public.team_messages (org_id);
create index if not exists idx_team_messages_team_id_created_at
  on public.team_messages (team_id, created_at desc);

-- Player Notes
create table if not exists public.player_notes (
  id           text primary key,
  org_id       text not null default '',
  player_email text not null,
  note         text not null,
  created_by   text not null default 'admin',
  created_at   timestamptz not null default now()
);

create index if not exists idx_player_notes_org_id on public.player_notes (org_id);
create index if not exists idx_player_notes_player_email on public.player_notes (player_email);
create index if not exists idx_player_notes_created_at on public.player_notes (player_email, created_at desc);

-- Demo Requests
-- Captures inbound leads from the /demo cold-outreach landing page.
-- business_type: one of gym, martial_arts, tennis, hockey, dance, tutoring, other
-- active_clients: self-reported current roster size (nullable — prospects may skip)
create table if not exists public.demo_requests (
  id             text primary key,
  business_name  text not null,
  business_type  text not null,
  active_clients integer,
  current_tool   text not null default '',
  email          text not null,
  phone          text not null default '',
  created_at     timestamptz not null default now()
);

create index if not exists idx_demo_requests_email on public.demo_requests (email);
create index if not exists idx_demo_requests_created_at on public.demo_requests (created_at desc);
create index if not exists idx_demo_requests_business_type on public.demo_requests (business_type);

-- ============================================================
-- Row-Level Security
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
alter table public.demo_requests    enable row level security;

-- Helper function for org context
create or replace function public.current_org_id()
  returns text
  language sql stable
  as $$
    select current_setting('app.org_id', true);
  $$;

-- RLS policies (service role bypasses these; anon/authenticated use org context)
create policy "org_select" on public.organizations for select using (id = public.current_org_id());

create policy "sessions_select" on public.sessions for select using (org_id = public.current_org_id());
create policy "sessions_insert" on public.sessions for insert with check (org_id = public.current_org_id());
create policy "sessions_update" on public.sessions for update using (org_id = public.current_org_id());
create policy "sessions_delete" on public.sessions for delete using (org_id = public.current_org_id());

create policy "registrations_select" on public.registrations for select using (org_id = public.current_org_id());
create policy "registrations_insert" on public.registrations for insert with check (org_id = public.current_org_id());
create policy "registrations_update" on public.registrations for update using (org_id = public.current_org_id());
create policy "registrations_delete" on public.registrations for delete using (org_id = public.current_org_id());

create policy "players_select" on public.players for select using (org_id = public.current_org_id());
create policy "players_insert" on public.players for insert with check (org_id = public.current_org_id());
create policy "players_update" on public.players for update using (org_id = public.current_org_id());

create policy "teams_select" on public.teams for select using (org_id = public.current_org_id());
create policy "teams_insert" on public.teams for insert with check (org_id = public.current_org_id());
create policy "teams_update" on public.teams for update using (org_id = public.current_org_id());
create policy "teams_delete" on public.teams for delete using (org_id = public.current_org_id());

create policy "team_players_select" on public.team_players for select using (org_id = public.current_org_id());
create policy "team_players_insert" on public.team_players for insert with check (org_id = public.current_org_id());
create policy "team_players_update" on public.team_players for update using (org_id = public.current_org_id());
create policy "team_players_delete" on public.team_players for delete using (org_id = public.current_org_id());

create policy "payments_select" on public.payments for select using (org_id = public.current_org_id());
create policy "payments_insert" on public.payments for insert with check (org_id = public.current_org_id());
create policy "payments_update" on public.payments for update using (org_id = public.current_org_id());

create policy "payment_plans_select" on public.payment_plans for select using (org_id = public.current_org_id());
create policy "payment_plans_insert" on public.payment_plans for insert with check (org_id = public.current_org_id());
create policy "payment_plans_update" on public.payment_plans for update using (org_id = public.current_org_id());

create policy "credits_select" on public.credits for select using (org_id = public.current_org_id());
create policy "credits_insert" on public.credits for insert with check (org_id = public.current_org_id());
create policy "credits_update" on public.credits for update using (org_id = public.current_org_id());

create policy "admin_tasks_select" on public.admin_tasks for select using (org_id = public.current_org_id());
create policy "admin_tasks_insert" on public.admin_tasks for insert with check (org_id = public.current_org_id());
create policy "admin_tasks_update" on public.admin_tasks for update using (org_id = public.current_org_id());
create policy "admin_tasks_delete" on public.admin_tasks for delete using (org_id = public.current_org_id());

create policy "news_posts_select" on public.news_posts for select using (org_id = public.current_org_id());
create policy "news_posts_insert" on public.news_posts for insert with check (org_id = public.current_org_id());
create policy "news_posts_update" on public.news_posts for update using (org_id = public.current_org_id());
create policy "news_posts_delete" on public.news_posts for delete using (org_id = public.current_org_id());

create policy "coaches_select" on public.coaches for select using (org_id = public.current_org_id());
create policy "coaches_insert" on public.coaches for insert with check (org_id = public.current_org_id());
create policy "coaches_update" on public.coaches for update using (org_id = public.current_org_id());

create policy "session_coaches_select" on public.session_coaches for select using (org_id = public.current_org_id());
create policy "session_coaches_insert" on public.session_coaches for insert with check (org_id = public.current_org_id());
create policy "session_coaches_update" on public.session_coaches for update using (org_id = public.current_org_id());

create policy "expenses_select" on public.expenses for select using (org_id = public.current_org_id());
create policy "expenses_insert" on public.expenses for insert with check (org_id = public.current_org_id());
create policy "expenses_update" on public.expenses for update using (org_id = public.current_org_id());
create policy "expenses_delete" on public.expenses for delete using (org_id = public.current_org_id());

create policy "team_games_select" on public.team_games for select using (org_id = public.current_org_id());
create policy "team_games_insert" on public.team_games for insert with check (org_id = public.current_org_id());
create policy "team_games_update" on public.team_games for update using (org_id = public.current_org_id());
create policy "team_games_delete" on public.team_games for delete using (org_id = public.current_org_id());

create policy "team_messages_select" on public.team_messages for select using (org_id = public.current_org_id());
create policy "team_messages_insert" on public.team_messages for insert with check (org_id = public.current_org_id());

create policy "player_notes_select" on public.player_notes for select using (org_id = public.current_org_id());
create policy "player_notes_insert" on public.player_notes for insert with check (org_id = public.current_org_id());
create policy "player_notes_update" on public.player_notes for update using (org_id = public.current_org_id());

-- ============================================================
-- Seed: demo org
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
