import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { makeId } from "@/lib/id";

/**
 * POST /api/org/register
 *
 * Org-scoped registration endpoint. The org is identified by the
 * x-fieldday-org-id header injected by the org middleware.
 *
 * Rejects submissions that attempt to specify a different org_id
 * (cross-org data injection guard).
 */

interface RegisterBody {
  full_name: string;
  email: string;
  phone?: string;
  guardian_name?: string;
  birth_year?: string;
  signup_type?: string;
  session_id?: string;
  participant_role?: string;
  jersey_1?: string;
  jersey_2?: string;
  jersey_3?: string;
  tshirt_size?: string;
  sweatshirt_size?: string;
  comments?: string;
  /** If the caller supplies an org_id it must match the middleware-injected one. */
  org_id?: string;
}

export async function POST(req: NextRequest) {
  // Middleware injects the resolved org ID — treat it as authoritative
  const orgId = req.headers.get("x-fieldday-org-id");

  if (!orgId) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    full_name,
    email,
    phone,
    guardian_name,
    birth_year,
    signup_type,
    session_id,
    participant_role,
    jersey_1,
    jersey_2,
    jersey_3,
    tshirt_size,
    sweatshirt_size,
    comments,
    org_id,
  } = body as RegisterBody;

  // Guard: reject cross-org data injection attempts
  if (org_id !== undefined && org_id !== orgId) {
    return NextResponse.json(
      { error: "org_id mismatch — you may not register data for another org" },
      { status: 403 }
    );
  }

  if (!full_name || typeof full_name !== "string" || full_name.trim().length === 0) {
    return NextResponse.json({ error: "full_name is required" }, { status: 400 });
  }

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "A valid email is required" },
      { status: 400 }
    );
  }

  const sb = getSupabaseServer();
  const regId = makeId("REG");

  const row = {
    id: regId,
    org_id: orgId,
    full_name: full_name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() ?? "",
    guardian_name: guardian_name?.trim() ?? "",
    birth_year: birth_year?.trim() ?? "",
    signup_type: signup_type?.trim() ?? "",
    session_id: session_id ?? "",
    participant_role: participant_role?.trim() ?? "",
    jersey_1: jersey_1?.trim() ?? "",
    jersey_2: jersey_2?.trim() ?? "",
    jersey_3: jersey_3?.trim() ?? "",
    tshirt_size: tshirt_size?.trim() ?? "",
    sweatshirt_size: sweatshirt_size?.trim() ?? "",
    comments: comments?.trim() ?? "",
    paid_status: "No",
    approval_status: "pending",
    timestamp: new Date().toISOString(),
  };

  const { error } = await sb.from("registrations").insert(row);

  if (error) {
    console.error("[org/register] Supabase insert error:", error.message);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, registrationId: regId }, { status: 201 });
}
