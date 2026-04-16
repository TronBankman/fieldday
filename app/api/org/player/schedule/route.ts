import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getPlayerClaims, playerUnauthorized } from "@/lib/player-auth";

export async function GET(req: NextRequest) {
  const claims = getPlayerClaims(req);
  if (!claims) return playerUnauthorized();

  try {
    const sb = getSupabaseServer();

    // Get all registrations for this player in this org
    const { data: regs, error } = await sb
      .from("registrations")
      .select("*")
      .eq("player_id", claims.playerId)
      .eq("org_id", claims.orgId)
      .order("timestamp", { ascending: false });

    if (error) throw new Error(error.message);

    // Get session details for registrations that have a session_id
    const sessionIds = [
      ...new Set((regs || []).map((r) => r.session_id).filter(Boolean)),
    ];
    let sessionsMap: Record<string, Record<string, unknown>> = {};
    if (sessionIds.length) {
      const { data: sessions } = await sb
        .from("sessions")
        .select(
          "id, name, date, time, location, program, duration_minutes, open_to_public"
        )
        .in("id", sessionIds);
      if (sessions) {
        sessionsMap = Object.fromEntries(sessions.map((s) => [s.id, s]));
      }
    }

    const registrations = (regs || []).map((r) => {
      const session = r.session_id ? sessionsMap[r.session_id] : null;
      return {
        id: r.id,
        timestamp: r.timestamp,
        signupType: r.signup_type || "",
        sessionId: r.session_id || "",
        sessionName: session ? (session.name as string) : "",
        sessionDate: session ? (session.date as string) : "",
        sessionTime: session ? (session.time as string) : "",
        sessionLocation: session ? (session.location as string) : "",
        sessionProgram: session ? (session.program as string) : "",
        sessionDuration: session
          ? (session.duration_minutes as number) || 60
          : 60,
        participantRole: r.participant_role || "",
        approvalStatus: r.approval_status || "pending",
        availability: r.availability || "no_response",
      };
    });

    return NextResponse.json({ registrations });
  } catch {
    return NextResponse.json(
      { error: "Unable to load schedule." },
      { status: 500 }
    );
  }
}
