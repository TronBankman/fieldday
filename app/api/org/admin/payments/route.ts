import { NextRequest, NextResponse } from "next/server";
import { getAdminOrgId, unauthorized } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/org/admin/payments
 * Returns payment summary: total due, collected, outstanding,
 * plus a list of unpaid registrations.
 */
export async function GET(req: NextRequest) {
  const orgId = getAdminOrgId(req);
  if (!orgId) return unauthorized();

  try {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("registrations")
      .select(
        "id, full_name, email, session_id, amount_due, amount_paid, paid_status"
      )
      .eq("org_id", orgId);

    if (error) throw new Error(error.message);

    const regs = data || [];
    const totalDue = regs.reduce((s, r) => s + (r.amount_due || 0), 0);
    const totalPaid = regs.reduce((s, r) => s + (r.amount_paid || 0), 0);

    const unpaid = regs
      .filter((r) => r.paid_status !== "Yes" && (r.amount_due || 0) > 0)
      .map((r) => ({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        sessionId: r.session_id || "",
        amountDue: r.amount_due || 0,
        amountPaid: r.amount_paid || 0,
      }));

    return NextResponse.json({
      totalDue,
      totalPaid,
      totalOutstanding: totalDue - totalPaid,
      unpaidCount: unpaid.length,
      unpaid,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Unable to load payment summary", details: message },
      { status: 500 }
    );
  }
}
