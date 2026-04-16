import { NextRequest, NextResponse } from "next/server";
import { getAdminOrgId, unauthorized } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/org/admin/me
 * Verifies the admin token and returns org info.
 */
export async function GET(req: NextRequest) {
  const orgId = getAdminOrgId(req);
  if (!orgId) return unauthorized();

  const sb = getSupabaseServer();
  const { data: org, error } = await sb
    .from("organizations")
    .select("id, name, slug, sport, primary_color, logo_url, contact_email")
    .eq("id", orgId)
    .maybeSingle();

  if (error || !org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      sport: org.sport,
      primaryColor: org.primary_color,
      logoUrl: org.logo_url,
      contactEmail: org.contact_email,
    },
  });
}
