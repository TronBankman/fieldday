/**
 * Per-org label overrides for non-hockey verticals (gyms, martial arts,
 * tennis, dance, tutoring). All keys are optional; the UI falls back to
 * the defaults below when a key is unset or empty.
 */
export interface OrganizationTerminology {
  player?: string;
  coach?: string;
  team?: string;
}

/**
 * Default hockey-flavored labels. Non-hockey orgs override via
 * `Organization.organization_terminology` (e.g., player→client for gyms,
 * coach→instructor for martial arts, team→group for tutoring cohorts).
 */
export const DEFAULT_TERMINOLOGY: Required<OrganizationTerminology> = {
  player: "player",
  coach: "coach",
  team: "team",
};

/** Resolve a term using the org override, falling back to the default. */
export function resolveTerm(
  terms: OrganizationTerminology | null | undefined,
  key: keyof OrganizationTerminology
): string {
  const override = terms?.[key];
  return override && override.trim().length > 0
    ? override
    : DEFAULT_TERMINOLOGY[key];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  sport: string;
  primary_color: string;
  logo_url: string;
  stripe_account_id: string;
  contact_email: string;
  organization_terminology: OrganizationTerminology;
  created_at: string;
}

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

/** Returns true if the slug is syntactically valid (lowercase alphanumeric + hyphens). */
export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

/**
 * Look up an org by slug using the service-role client (bypasses RLS).
 * Returns null if the org is not found or the slug is invalid.
 * Throws only on unexpected Supabase errors.
 */
export async function getOrgBySlug(slug: string): Promise<Organization | null> {
  if (!isValidSlug(slug)) return null;

  const { getSupabaseServer } = await import("./supabase/server");
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase error looking up org "${slug}": ${error.message}`);
  }

  return data as Organization | null;
}
