import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getPlayerClaims, playerUnauthorized } from "@/lib/player-auth";

export async function GET(req: NextRequest) {
  const claims = getPlayerClaims(req);
  if (!claims) return playerUnauthorized();

  try {
    const sb = getSupabaseServer();

    // Get all registrations with payment info for this player
    const { data: regs, error } = await sb
      .from("registrations")
      .select("*")
      .eq("player_id", claims.playerId)
      .eq("org_id", claims.orgId)
      .order("timestamp", { ascending: false });

    if (error) throw new Error(error.message);

    // Get session names for context
    const sessionIds = [
      ...new Set((regs || []).map((r) => r.session_id).filter(Boolean)),
    ];
    let sessionsMap: Record<string, Record<string, unknown>> = {};
    if (sessionIds.length) {
      const { data: sessions } = await sb
        .from("sessions")
        .select("id, name, date, price, allow_installments, installment_count")
        .in("id", sessionIds);
      if (sessions) {
        sessionsMap = Object.fromEntries(sessions.map((s) => [s.id, s]));
      }
    }

    const payments = (regs || [])
      .filter((r) => r.amount_due > 0 || r.amount_paid > 0)
      .map((r) => {
        const session = r.session_id ? sessionsMap[r.session_id] : null;
        return {
          registrationId: r.id,
          sessionName: session ? (session.name as string) : r.session_id || "",
          sessionDate: session ? (session.date as string) : "",
          amountDue: r.amount_due || 0,
          amountPaid: r.amount_paid || 0,
          paidStatus: r.paid_status || "No",
          allowInstallments: session
            ? !!(session.allow_installments)
            : false,
          installmentCount: session
            ? (session.installment_count as number) || 3
            : 3,
        };
      });

    const totalDue = payments.reduce((sum, p) => sum + p.amountDue, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);

    return NextResponse.json({
      payments,
      summary: { totalDue, totalPaid, outstanding: totalDue - totalPaid },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load payments." },
      { status: 500 }
    );
  }
}
