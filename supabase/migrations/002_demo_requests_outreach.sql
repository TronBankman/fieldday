-- ============================================================
-- Field Day — demo_requests: outreach-landing schema
-- ============================================================
-- The /demo landing page is the conversion surface for cold
-- outreach. This migration aligns demo_requests with the fields
-- captured by that form. It is idempotent and safe to run on
-- environments that already applied 001_init.sql's older schema.

-- Add new columns (ADD COLUMN IF NOT EXISTS is safe on Postgres 9.6+)
alter table public.demo_requests add column if not exists business_name  text;
alter table public.demo_requests add column if not exists business_type  text;
alter table public.demo_requests add column if not exists active_clients integer;
alter table public.demo_requests add column if not exists phone          text not null default '';

-- Backfill business_name from legacy "org" column if present, then drop legacy columns.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'demo_requests' and column_name = 'org'
  ) then
    update public.demo_requests set business_name = coalesce(business_name, org);
    alter table public.demo_requests drop column org;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'demo_requests' and column_name = 'sport'
  ) then
    update public.demo_requests set business_type = coalesce(business_type, sport);
    alter table public.demo_requests drop column sport;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'demo_requests' and column_name = 'name'
  ) then
    -- legacy "name" was the contact person's name; fold it into business_name if business_name is still null
    update public.demo_requests set business_name = coalesce(business_name, name);
    alter table public.demo_requests drop column name;
  end if;
end $$;

-- Enforce NOT NULL once backfill is done (only if no nulls remain).
do $$
begin
  if not exists (select 1 from public.demo_requests where business_name is null) then
    alter table public.demo_requests alter column business_name set not null;
  end if;
  if not exists (select 1 from public.demo_requests where business_type is null) then
    alter table public.demo_requests alter column business_type set not null;
  end if;
end $$;

create index if not exists idx_demo_requests_business_type
  on public.demo_requests (business_type);
