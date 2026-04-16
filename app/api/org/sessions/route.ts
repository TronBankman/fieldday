import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveOrgId } from "@/lib/resolve-org";

/**
 * GET /api/org/sessions
 *
 * Returns upcoming sessions for the org identified by
 * the x-fieldday-org-id header (injected by proxy) or
 * x-fieldday-org-slug header (sent by client-side fetches).
 */
export async function GET(req: NextRequest) {
  const orgId = await resolveOrgId(req);

  if (!orgId) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const sb = getSupabaseServer();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data, error } = await sb
    .from("sessions")
    .select(
      "id, name, date, time, location, price, allow_installments, installment_count"
    )
    .eq("org_id", orgId)
    .gte("date", today)
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load sessions" },
      { status: 500 }
    );
  }

  return NextResponse.json({ sessions: data ?? [] });
}
