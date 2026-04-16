import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getPlayerClaims, playerUnauthorized } from "@/lib/player-auth";

function normalize(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone || "",
    birthYear: row.birth_year || "",
    guardianName: row.guardian_name || "",
  };
}

export async function GET(req: NextRequest) {
  const claims = getPlayerClaims(req);
  if (!claims) return playerUnauthorized();

  try {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("players")
      .select("*")
      .eq("id", claims.playerId)
      .eq("org_id", claims.orgId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ player: normalize(data) });
  } catch {
    return NextResponse.json(
      { error: "Unable to load profile." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const claims = getPlayerClaims(req);
  if (!claims) return playerUnauthorized();

  try {
    const body = await req.json();
    const sb = getSupabaseServer();

    const updates: Record<string, unknown> = {};
    const fields: Record<string, string> = {
      fullName: "full_name",
      phone: "phone",
      birthYear: "birth_year",
      guardianName: "guardian_name",
    };

    for (const [camel, snake] of Object.entries(fields)) {
      if (camel in body) {
        updates[snake] = String(body[camel] ?? "");
      }
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: "No fields to update." },
        { status: 400 }
      );
    }

    const { data, error } = await sb
      .from("players")
      .update(updates)
      .eq("id", claims.playerId)
      .eq("org_id", claims.orgId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ player: normalize(data) });
  } catch {
    return NextResponse.json(
      { error: "Unable to update profile." },
      { status: 500 }
    );
  }
}
