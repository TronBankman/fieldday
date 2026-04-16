import { NextRequest } from "next/server";
import { getSupabaseServer } from "./supabase/server";

/**
 * Resolve the org ID from a request.
 *
 * Checks in order:
 * 1. x-fieldday-org-id header (injected by proxy middleware on page routes)
 * 2. x-fieldday-org-slug header (sent by client-side fetches) — does a DB lookup
 *
 * Returns the org ID string or null if unresolvable.
 */
export async function resolveOrgId(req: NextRequest): Promise<string | null> {
  const orgId = req.headers.get("x-fieldday-org-id");
  if (orgId) return orgId;

  const slug = req.headers.get("x-fieldday-org-slug");
  if (!slug) return null;

  try {
    const sb = getSupabaseServer();
    const { data } = await sb
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    return data?.id ?? null;
  } catch {
    return null;
  }
}
