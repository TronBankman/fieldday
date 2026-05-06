import { NextRequest, NextResponse } from "next/server";
import { getAdminOrgId, unauthorized } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { OrganizationTerminology } from "@/lib/orgs";

/**
 * Supported terminology override keys. Kept in sync with
 * `OrganizationTerminology` in lib/orgs.ts. Unknown keys in PATCH
 * payloads are ignored rather than rejected so future keys can be
 * added without breaking older clients.
 */
const TERM_KEYS = ["player", "coach", "team"] as const;
type TermKey = (typeof TERM_KEYS)[number];

const MAX_TERM_LENGTH = 40;

/** Normalize a single override value: trim, drop empties, cap length. */
function sanitizeTerm(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, MAX_TERM_LENGTH);
}

/**
 * GET /api/org/admin/settings
 * Returns settings the admin may edit. Today: just terminology.
 */
export async function GET(req: NextRequest) {
  const orgId = getAdminOrgId(req);
  if (!orgId) return unauthorized();

  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("organizations")
    .select("organization_terminology")
    .eq("id", orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Unable to load settings", details: error.message },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const terminology = (data.organization_terminology ?? {}) as OrganizationTerminology;
  return NextResponse.json({ terminology });
}

/**
 * PATCH /api/org/admin/settings
 * Updates the org's terminology overrides. Body shape:
 *   { terminology: { player?, coach?, team? } }
 * Empty strings clear an override.
 */
export async function PATCH(req: NextRequest) {
  const orgId = getAdminOrgId(req);
  if (!orgId) return unauthorized();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = payload as { terminology?: Record<string, unknown> } | null;
  const incoming = body?.terminology;
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json(
      { error: "Missing terminology object" },
      { status: 400 }
    );
  }

  const next: OrganizationTerminology = {};
  for (const key of TERM_KEYS) {
    if (!(key in incoming)) continue;
    const cleaned = sanitizeTerm(incoming[key as TermKey]);
    if (cleaned) next[key] = cleaned;
    // If the caller sent an empty/whitespace string, we omit the key —
    // which effectively clears the override.
  }

  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("organizations")
    .update({ organization_terminology: next })
    .eq("id", orgId)
    .select("organization_terminology")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Unable to save settings", details: error.message },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    terminology: (data.organization_terminology ?? {}) as OrganizationTerminology,
  });
}
