import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/org/sessions
 *
 * Returns upcoming sessions for the org identified by
 * the x-fieldday-org-id header (injected by middleware).
 */
export async function GET(req: NextRequest) {
  const orgId = req.headers.get("x-fieldday-org-id");

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
