import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { verifyAdminToken } from "@/lib/auth";

function getOrigin(req: NextRequest): string {
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  // ---------- Auth: verify admin cookie ----------
  const token = req.cookies.get("fieldday_admin")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const claims = verifyAdminToken(token);
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // ---------- Parse slug ----------
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  // ---------- Look up org ----------
  const supabase = getSupabaseServer();
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, stripe_account_id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Verify the admin token belongs to this org
  if (claims.sub !== (org as { id: string }).id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgData = org as { id: string; stripe_account_id: string; slug: string };

  if (!orgData.stripe_account_id) {
    return NextResponse.json(
      { error: "No Stripe account configured" },
      { status: 400 },
    );
  }

  // ---------- Generate fresh Account Link ----------
  try {
    const stripe = getStripe();
    const origin = getOrigin(req);

    const accountLink = await stripe.accountLinks.create({
      account: orgData.stripe_account_id,
      type: "account_onboarding",
      refresh_url: `${origin}/signup/stripe-refresh?org=${orgData.slug}`,
      return_url: `${origin}/${orgData.slug}/admin?onboarded=1`,
    });

    // Update cached URL
    await supabase
      .from("organizations")
      .update({ stripe_onboarding_url: accountLink.url })
      .eq("id", orgData.id);

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("Stripe refresh failed for org", orgData.id, err);
    return NextResponse.json(
      { error: "Failed to generate Stripe link" },
      { status: 500 },
    );
  }
}
