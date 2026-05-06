import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveOrgId } from "@/lib/resolve-org";
import {
  DEFAULT_TERMS,
  resolveTerm,
  type TermKey,
  type TerminologyOverrides,
} from "@/src/lib/terminology";

/**
 * GET /api/org/terminology
 *
 * Public, unauthenticated. Returns the resolved terminology map for the
 * org identified by either:
 *   - x-fieldday-org-id          (injected by proxy on /[org]/* routes)
 *   - x-fieldday-org-slug        (sent by client-side fetches)
 *   - x-fieldday-org-terminology (injected by proxy — pre-loaded JSONB)
 *
 * Response shape: { terms: { player, players, coach, coaches, team, teams, ... } }
 *
 * If the org has no overrides, every key falls back to DEFAULT_TERMS.
 * If the org cannot be resolved, returns DEFAULT_TERMS (never 404 — UI
 * renders fine on defaults; we only know the org from headers anyway).
 */
export async function GET(req: NextRequest) {
  const overrides = await loadOverrides(req);
  const terms: Record<TermKey, string> = {} as Record<TermKey, string>;
  for (const key of Object.keys(DEFAULT_TERMS) as TermKey[]) {
    terms[key] = resolveTerm(key, overrides);
  }
  return NextResponse.json({ terms });
}

async function loadOverrides(
  req: NextRequest,
): Promise<TerminologyOverrides> {
  // Fast path: middleware already serialized the JSONB into a header.
  const headerValue = req.headers.get("x-fieldday-org-terminology");
  if (headerValue) {
    try {
      const parsed = JSON.parse(headerValue);
      if (parsed && typeof parsed === "object") {
        return parsed as TerminologyOverrides;
      }
    } catch {
      // Fall through to DB lookup
    }
  }

  // Slow path: client-side fetches that hit /api/* don't go through the
  // /[org]/* proxy, so no terminology header is injected. Resolve via the
  // x-fieldday-org-slug header → org id → DB lookup.
  const orgId = await resolveOrgId(req);
  if (!orgId) return {};

  try {
    const sb = getSupabaseServer();
    const { data } = await sb
      .from("organizations")
      .select("organization_terminology")
      .eq("id", orgId)
      .maybeSingle();

    const row = data as
      | { organization_terminology?: TerminologyOverrides | null }
      | null;
    return row?.organization_terminology ?? {};
  } catch {
    return {};
  }
}
