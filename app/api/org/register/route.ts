import { NextRequest, NextResponse } from "next/server";

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

  const { full_name, email, phone, org_id } = body as RegisterBody;

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

  // In production: persist to Supabase with org_id scoping.
  // The service-role client is used here (bypasses RLS), and org_id is
  // set explicitly from the trusted middleware header — never from the body.
  console.log("[org/register] New registration:", {
    org_id: orgId,
    full_name: full_name.trim(),
    email: email.trim(),
    phone: phone?.trim() ?? "",
    registeredAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
