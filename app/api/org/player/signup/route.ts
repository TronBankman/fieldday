import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createPlayerToken, hashPassword } from "@/lib/auth";
import { isEmail } from "@/lib/helpers";
import { makeId } from "@/lib/id";
import { resolveOrgId } from "@/lib/resolve-org";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrgId(req);
  if (!orgId) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  let body: {
    email?: string;
    password?: string;
    fullName?: string;
    phone?: string;
    birthYear?: string;
    guardianName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, fullName } = body;

  if (!fullName || !fullName.trim()) {
    return NextResponse.json(
      { error: "Full name is required." },
      { status: 400 }
    );
  }
  if (!email || !isEmail(email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 }
    );
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  try {
    const sb = getSupabaseServer();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists for this org
    const { data: existing } = await sb
      .from("players")
      .select("id")
      .eq("org_id", orgId)
      .eq("email", normalizedEmail)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const playerId = makeId("PLR");
    const passwordHash = await hashPassword(password);

    const { error: insertErr } = await sb.from("players").insert({
      id: playerId,
      org_id: orgId,
      email: normalizedEmail,
      password_hash: passwordHash,
      full_name: fullName.trim(),
      phone: body.phone?.trim() || "",
      birth_year: body.birthYear?.trim() || "",
      guardian_name: body.guardianName?.trim() || "",
    });

    if (insertErr) throw new Error(insertErr.message);

    // Link past registrations by email
    await sb
      .from("registrations")
      .update({ player_id: playerId })
      .eq("player_id", "")
      .eq("org_id", orgId)
      .ilike("email", normalizedEmail);

    const token = createPlayerToken(orgId, playerId, normalizedEmail);

    return NextResponse.json(
      {
        token,
        player: {
          id: playerId,
          email: normalizedEmail,
          fullName: fullName.trim(),
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to create account." },
      { status: 500 }
    );
  }
}
