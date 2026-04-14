import { NextRequest, NextResponse } from "next/server";
import { getAdminOrgId, unauthorized } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/org/admin/registrations
 * Returns all registrations for the admin's org, with session info joined.
 */
export async function GET(req: NextRequest) {
  const orgId = getAdminOrgId(req);
  if (!orgId) return unauthorized();

  try {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("registrations")
      .select("*")
      .eq("org_id", orgId)
      .order("timestamp", { ascending: false });

    if (error) throw new Error(error.message);

    const registrations = (data || []).map((r) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone || "",
      birthYear: r.birth_year || "",
      guardianName: r.guardian_name || "",
      signupType: r.signup_type || "",
      sessionId: r.session_id || "",
      participantRole: r.participant_role || "",
      jersey1: r.jersey_1 || "",
      jersey2: r.jersey_2 || "",
      jersey3: r.jersey_3 || "",
      tshirtSize: r.tshirt_size || "",
      sweatshirtSize: r.sweatshirt_size || "",
      comments: r.comments || "",
      paidStatus: r.paid_status || "No",
      approvalStatus: r.approval_status || "pending",
      amountDue: r.amount_due || 0,
      amountPaid: r.amount_paid || 0,
      timestamp: r.timestamp || "",
    }));

    return NextResponse.json({ registrations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Unable to load registrations", details: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/org/admin/registrations
 * Update a registration (approval_status, paid_status, etc.)
 */
export async function PATCH(req: NextRequest) {
  const orgId = getAdminOrgId(req);
  if (!orgId) return unauthorized();

  try {
    const payload = await req.json();
    if (!payload.id) {
      return NextResponse.json(
        { error: "Registration ID is required" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (payload.approvalStatus !== undefined)
      updates.approval_status = payload.approvalStatus;
    if (payload.paidStatus !== undefined)
      updates.paid_status = payload.paidStatus;
    if (payload.amountDue !== undefined)
      updates.amount_due = Number(payload.amountDue);
    if (payload.amountPaid !== undefined)
      updates.amount_paid = Number(payload.amountPaid);

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("registrations")
      .update(updates)
      .eq("id", payload.id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ registration: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Unable to update registration", details: message },
      { status: 500 }
    );
  }
}
