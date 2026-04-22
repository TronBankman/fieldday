/**
 * Per-org terminology helper.
 *
 * Fieldday ships with hockey-flavored defaults (player, coach, team, ...) but
 * orgs in other verticals (gyms, tutoring, martial arts, dance) can override
 * those labels. Overrides are stored in `organizations.organization_terminology`
 * (JSONB column, migration 003) as a flat key → string map.
 *
 * Public API:
 *   t(key, orgId)                    → async label lookup for server components
 *   resolveTerm(key, overrides)      → pure resolver (testable without a DB)
 *   pluralize(word)                  → simple English pluralization
 *   DEFAULT_TERMS                    → the built-in default dictionary
 *
 * Pluralization behavior: if an org overrides a singular ("player" → "client")
 * but does NOT set an explicit plural override, the plural key ("players") is
 * derived by pluralizing the singular override ("clients"). Orgs can always
 * override the plural directly for irregular cases (e.g. "child" → "children").
 */

export type SingularTermKey =
  | "player"
  | "coach"
  | "team"
  | "session"
  | "registration";

export type PluralTermKey =
  | "players"
  | "coaches"
  | "teams"
  | "sessions"
  | "registrations";

export type TermKey = SingularTermKey | PluralTermKey;

export type TerminologyOverrides = Partial<Record<TermKey, string>>;

export const DEFAULT_TERMS: Readonly<Record<TermKey, string>> = Object.freeze({
  player: "player",
  players: "players",
  coach: "coach",
  coaches: "coaches",
  team: "team",
  teams: "teams",
  session: "session",
  sessions: "sessions",
  registration: "registration",
  registrations: "registrations",
});

// Plural keys map back to their singular form so we can auto-pluralize a
// singular override when a plural key is requested without its own override.
const SINGULAR_OF: Readonly<Record<PluralTermKey, SingularTermKey>> = Object.freeze({
  players: "player",
  coaches: "coach",
  teams: "team",
  sessions: "session",
  registrations: "registration",
});

function isPluralKey(key: TermKey): key is PluralTermKey {
  return key in SINGULAR_OF;
}

/**
 * Simple English pluralizer. Handles the common suffix cases (-s/-x/-z/-ch/-sh
 * → +es, consonant+y → -ies, default → +s). Does not handle irregular plurals
 * (child → children); orgs should set the plural override explicitly for those.
 */
export function pluralize(word: string): string {
  const w = word.trim();
  if (!w) return w;
  if (/(s|x|z|ch|sh)$/i.test(w)) return w + "es";
  if (/[^aeiouAEIOU]y$/.test(w)) return w.slice(0, -1) + "ies";
  return w + "s";
}

/**
 * Pure term resolver. Given a key and the org's overrides map (which may be
 * null/undefined/empty), returns the appropriate label. Never throws.
 */
export function resolveTerm(
  key: TermKey,
  overrides: TerminologyOverrides | null | undefined,
): string {
  const direct = overrides?.[key]?.trim();
  if (direct) return direct;

  if (isPluralKey(key)) {
    const singularKey = SINGULAR_OF[key];
    const singularOverride = overrides?.[singularKey]?.trim();
    if (singularOverride) return pluralize(singularOverride);
  }

  return DEFAULT_TERMS[key];
}

/**
 * Fetches the terminology override map for an org from the organizations
 * table. Returns {} on any missing row, null column, or Supabase error —
 * terminology lookups must never block a render.
 *
 * Exported for tests; production callers should use `t()`.
 */
export async function loadOverrides(
  orgId: string,
): Promise<TerminologyOverrides> {
  const { getSupabaseServer } = await import("../../lib/supabase/server");
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("organizations")
    .select("organization_terminology")
    .eq("id", orgId)
    .maybeSingle();

  if (error || !data) return {};

  const row = data as {
    organization_terminology?: TerminologyOverrides | null;
  };
  return row.organization_terminology ?? {};
}

/**
 * Server-component terminology lookup. Returns the org's override for `key`,
 * or the default if the org has no override (or no orgId is provided).
 *
 * Safe to call from React Server Components. Never throws — returns the
 * default label on any lookup failure so the UI keeps rendering.
 */
export async function t(
  key: TermKey,
  orgId: string | null | undefined,
): Promise<string> {
  if (!orgId) return DEFAULT_TERMS[key];

  try {
    const overrides = await loadOverrides(orgId);
    return resolveTerm(key, overrides);
  } catch {
    return DEFAULT_TERMS[key];
  }
}
