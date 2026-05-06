import { NextRequest, NextResponse } from "next/server";
import { getAdminOrgId, unauthorized } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/org/admin/onboarding
 * Returns the org's onboarding state + stripe_onboarding_url.
 */
export async function GET(req: NextRequest) {
  const orgId = getAdminOrgId(req);
  if (!orgId) return unauthorized();

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("organizations")
    .select("onboarding_state, stripe_onboarding_url, terminology")
    .eq("id", orgId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  const row = data as {
    onboarding_state: string;
    stripe_onboarding_url: string;
    terminology: string;
  };

  return NextResponse.json({
    onboardingState: row.onboarding_state,
    stripeOnboardingUrl: row.stripe_onboarding_url,
    terminology: row.terminology,
  });
}

/**
 * PATCH /api/org/admin/onboarding
 * Updates onboarding_state. Used to dismiss the welcome banner.
 * Only allows transitioning to 'active' (dismiss).
 */
export async function PATCH(req: NextRequest) {
  const orgId = getAdminOrgId(req);
  if (!orgId) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const state = String(body.onboardingState ?? "");
  if (state !== "active") {
    return NextResponse.json(
      { error: "Can only set onboarding state to 'active'" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("organizations")
    .update({ onboarding_state: "active" })
    .eq("id", orgId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update onboarding state" },
      { status: 500 },
    );
  }

  return NextResponse.json({ onboardingState: "active" });
}
