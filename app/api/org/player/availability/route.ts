import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getPlayerClaims, playerUnauthorized } from "@/lib/player-auth";

const VALID_VALUES = ["attending", "not_attending", "no_response"];

export async function PUT(req: NextRequest) {
  const claims = getPlayerClaims(req);
  if (!claims) return playerUnauthorized();

  let body: { registrationId?: string; availability?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { registrationId, availability } = body;

  if (!registrationId || !availability || !VALID_VALUES.includes(availability)) {
    return NextResponse.json(
      { error: "Invalid registrationId or availability value" },
      { status: 400 }
    );
  }

  try {
    const sb = getSupabaseServer();

    // Verify the registration belongs to this player and org
    const { data: reg } = await sb
      .from("registrations")
      .select("id, player_id")
      .eq("id", registrationId)
      .eq("org_id", claims.orgId)
      .single();

    if (!reg || reg.player_id !== claims.playerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await sb
      .from("registrations")
      .update({ availability })
      .eq("id", registrationId)
      .eq("org_id", claims.orgId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, availability });
  } catch {
    return NextResponse.json(
      { error: "Unable to update availability" },
      { status: 500 }
    );
  }
}
