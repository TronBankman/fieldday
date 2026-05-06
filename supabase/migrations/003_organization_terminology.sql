-- ============================================================
-- Field Day — Organization terminology overrides
-- ============================================================
-- Adds a JSONB `organization_terminology` column to organizations so
-- non-hockey verticals (gyms, martial arts, tennis, dance, tutoring)
-- can override the default hockey-flavored labels at the UI layer.
--
-- Shape (all keys optional — falls back to defaults when unset):
--   {
--     "player":   "client"      | "student" | "athlete" | ...
--     "coach":    "instructor"  | "trainer" | "teacher" | ...
--     "team":     "group"       | "class"   | "squad"   | ...
--   }
--
-- The column defaults to '{}'::jsonb and is never null; callers should
-- merge the stored object onto the app-wide defaults.
-- ============================================================

alter table public.organizations
  add column if not exists organization_terminology jsonb not null default '{}'::jsonb;
