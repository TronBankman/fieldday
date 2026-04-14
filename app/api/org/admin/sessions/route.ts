import { NextRequest, NextResponse } from "next/server";
import { getAdminOrgId, unauthorized } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { parseOptionalBirthYear } from "@/lib/helpers";
import { makeId } from "@/lib/id";

/**
 * GET /api/org/admin/sessions
 * Returns all active sessions for the admin's org.
 */
export async function GET(req: NextRequest) {
  const orgId = getAdminOrgId(req);
  if (!orgId) return unauthorized();

  try {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("sessions")
      .select("*")
      .eq("org_id", orgId)
      .eq("active", true)
      .order("date", { ascending: true });

    if (error) throw new Error(error.message);

    const sessions = (data || []).map((s) => ({
      id: s.id,
      name: s.name,
      date: s.date,
      time: s.time,
      location: s.location,
      program: s.program || "",
      teamId: s.team_id || "",
      openToPublic: s.open_to_public || false,
      price: s.price || 0,
      forwardSpots: s.forward_spots || 0,
      defenceSpots: s.defence_spots || 0,
      skaterSpots: s.skater_spots || 0,
      goalieSpots: s.goalie_spots || 0,
      birthYearMin: s.birth_year_min || 0,
      birthYearMax: s.birth_year_max || 0,
      durationMinutes: s.duration_minutes || 60,
      allowInstallments: s.allow_installments || false,
      installmentCount: s.installment_count || 3,
    }));

    return NextResponse.json({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Unable to load sessions", details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/org/admin/sessions
 * Create a new session for the admin's org.
 */
export async function POST(req: NextRequest) {
  const orgId = getAdminOrgId(req);
  if (!orgId) return unauthorized();

  try {
    const payload = await req.json();
    if (!payload.name || !payload.date || !payload.time || !payload.location) {
      return NextResponse.json(
        { error: "name, date, time, and location are required" },
        { status: 400 }
      );
    }

    const minYear = parseOptionalBirthYear(payload.birthYearMin);
    const maxYear = parseOptionalBirthYear(payload.birthYearMax);

    if (Number.isNaN(minYear) || Number.isNaN(maxYear)) {
      return NextResponse.json(
        { error: "Birth year fields must be valid years." },
        { status: 400 }
      );
    }

    if (
      Number.isInteger(minYear) &&
      Number.isInteger(maxYear) &&
      minYear! > maxYear!
    ) {
      return NextResponse.json(
        {
          error:
            "Minimum birth year cannot be greater than maximum birth year.",
        },
        { status: 400 }
      );
    }

    const priceInCents = Math.round(Number(payload.price || 0) * 100);

    const sb = getSupabaseServer();
    const row = {
      id: makeId("SES"),
      org_id: orgId,
      name: payload.name,
      date: payload.date,
      time: payload.time,
      location: payload.location,
      program: payload.program || "",
      spots: Number(payload.spots || 0),
      birth_year_min: Number(minYear || 0),
      birth_year_max: Number(maxYear || 0),
      forward_spots: Number(payload.forwardSpots || 0),
      defence_spots: Number(payload.defenceSpots || 0),
      skater_spots: Number(payload.skaterSpots || 0),
      goalie_spots: Number(payload.goalieSpots || 0),
      price: priceInCents,
      duration_minutes: Number(payload.durationMinutes || 60),
      team_id: payload.teamId || "",
      open_to_public:
        payload.openToPublic === true || payload.openToPublic === "true",
      allow_installments:
        payload.allowInstallments === true ||
        payload.allowInstallments === "true",
      installment_count: Math.max(
        2,
        Number(payload.installmentCount || 3)
      ),
      active: true,
    };

    const { data, error } = await sb
      .from("sessions")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ session: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Unable to add session", details: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/org/admin/sessions
 * Update an existing session.
 */
export async function PATCH(req: NextRequest) {
  const orgId = getAdminOrgId(req);
  if (!orgId) return unauthorized();

  try {
    const payload = await req.json();
    if (!payload.id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.date !== undefined) updates.date = payload.date;
    if (payload.time !== undefined) updates.time = payload.time;
    if (payload.location !== undefined) updates.location = payload.location;
    if (payload.program !== undefined) updates.program = payload.program;
    if (payload.spots !== undefined)
      updates.spots = Number(payload.spots || 0);
    if (payload.price !== undefined)
      updates.price = Math.round(Number(payload.price || 0) * 100);
    if (payload.durationMinutes !== undefined)
      updates.duration_minutes = Number(payload.durationMinutes || 60);
    if (payload.forwardSpots !== undefined)
      updates.forward_spots = Number(payload.forwardSpots || 0);
    if (payload.defenceSpots !== undefined)
      updates.defence_spots = Number(payload.defenceSpots || 0);
    if (payload.skaterSpots !== undefined)
      updates.skater_spots = Number(payload.skaterSpots || 0);
    if (payload.goalieSpots !== undefined)
      updates.goalie_spots = Number(payload.goalieSpots || 0);
    if (payload.teamId !== undefined) updates.team_id = payload.teamId;
    if (payload.openToPublic !== undefined)
      updates.open_to_public =
        payload.openToPublic === true || payload.openToPublic === "true";
    if (payload.allowInstallments !== undefined)
      updates.allow_installments =
        payload.allowInstallments === true ||
        payload.allowInstallments === "true";
    if (payload.installmentCount !== undefined)
      updates.installment_count = Math.max(
        2,
        Number(payload.installmentCount || 3)
      );
    if (payload.birthYearMin !== undefined)
      updates.birth_year_min = Number(
        parseOptionalBirthYear(payload.birthYearMin) || 0
      );
    if (payload.birthYearMax !== undefined)
      updates.birth_year_max = Number(
        parseOptionalBirthYear(payload.birthYearMax) || 0
      );

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("sessions")
      .update(updates)
      .eq("id", payload.id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ session: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Unable to update session", details: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/org/admin/sessions
 * Soft-delete a session (set active = false).
 */
export async function DELETE(req: NextRequest) {
  const orgId = getAdminOrgId(req);
  if (!orgId) return unauthorized();

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const sb = getSupabaseServer();
    const { error } = await sb
      .from("sessions")
      .update({ active: false })
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Unable to delete session", details: message },
      { status: 500 }
    );
  }
}
