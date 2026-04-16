import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, verifyPassword } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveOrgId } from "@/lib/resolve-org";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrgId(req);
  if (!orgId) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { password } = body;
  if (!password) {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 }
    );
  }

  const sb = getSupabaseServer();
  const { data: org, error } = await sb
    .from("organizations")
    .select("id, admin_password_hash")
    .eq("id", orgId)
    .maybeSingle();

  if (error || !org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  if (!org.admin_password_hash) {
    return NextResponse.json(
      { error: "Admin access not configured for this organization" },
      { status: 403 }
    );
  }

  const valid = await verifyPassword(password, org.admin_password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 }
    );
  }

  const token = createAdminToken(orgId);
  return NextResponse.json({ token });
}
