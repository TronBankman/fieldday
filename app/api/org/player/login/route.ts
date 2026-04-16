import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createPlayerToken, verifyPassword } from "@/lib/auth";
import { isEmail } from "@/lib/helpers";
import { resolveOrgId } from "@/lib/resolve-org";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrgId(req);
  if (!orgId) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !isEmail(email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 }
    );
  }
  if (!password) {
    return NextResponse.json(
      { error: "Password is required." },
      { status: 400 }
    );
  }

  try {
    const sb = getSupabaseServer();
    const normalizedEmail = email.toLowerCase().trim();

    const { data: player } = await sb
      .from("players")
      .select("*")
      .eq("org_id", orgId)
      .eq("email", normalizedEmail)
      .single();

    if (!player) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, player.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Link any unlinked registrations by email
    await sb
      .from("registrations")
      .update({ player_id: player.id })
      .eq("player_id", "")
      .eq("org_id", orgId)
      .ilike("email", normalizedEmail);

    const token = createPlayerToken(orgId, player.id, normalizedEmail);

    return NextResponse.json({
      token,
      player: {
        id: player.id,
        email: player.email,
        fullName: player.full_name,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to log in." },
      { status: 500 }
    );
  }
}
