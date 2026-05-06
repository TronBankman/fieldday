import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { makeId } from "@/lib/id";
import { hashPassword, createAdminToken } from "@/lib/auth";
import { isValidPreset, getPresetColor } from "@/lib/terminology";

const SLUG_RE = /^[a-z0-9-]+$/;
const SLUG_MIN = 3;
const SLUG_MAX = 40;
const PASSWORD_MIN = 10;
const NAME_MIN = 2;
const NAME_MAX = 80;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESERVED_SLUGS = new Set([
  "api",
  "signup",
  "login",
  "demo",
  "admin",
  "www",
  "app",
  "assets",
  "_next",
  "favicon",
]);

function getOrigin(req: NextRequest): string {
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  const ownerEmail = String(body.ownerEmail ?? "").trim();
  const password = String(body.password ?? "");
  const terminology = String(body.terminology ?? "sports").trim();

  // ---------- Validation ----------

  if (!name || name.length < NAME_MIN || name.length > NAME_MAX) {
    return NextResponse.json(
      { error: "Organization name must be 2-80 characters" },
      { status: 400 },
    );
  }

  if (
    !slug ||
    slug.length < SLUG_MIN ||
    slug.length > SLUG_MAX ||
    !SLUG_RE.test(slug)
  ) {
    return NextResponse.json(
      { error: "Slug must be 3-40 lowercase alphanumeric characters or hyphens" },
      { status: 400 },
    );
  }

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json(
      { error: "This slug is reserved" },
      { status: 400 },
    );
  }

  if (!ownerEmail || !EMAIL_RE.test(ownerEmail)) {
    return NextResponse.json(
      { error: "A valid email address is required" },
      { status: 400 },
    );
  }

  if (!password || password.length < PASSWORD_MIN) {
    return NextResponse.json(
      { error: `Password must be at least ${PASSWORD_MIN} characters` },
      { status: 400 },
    );
  }

  if (!isValidPreset(terminology)) {
    return NextResponse.json(
      { error: "Invalid terminology preset" },
      { status: 400 },
    );
  }

  // ---------- Create org ----------

  const supabase = getSupabaseServer();
  const orgId = makeId("ORG");
  const passwordHash = await hashPassword(password);
  const primaryColor = getPresetColor(terminology);

  // Insert org row
  const { error: insertError } = await supabase
    .from("organizations")
    .insert({
      id: orgId,
      name,
      slug,
      owner_email: ownerEmail,
      terminology,
      admin_password_hash: passwordHash,
      onboarding_state: "stripe_pending",
      sport: "",
      primary_color: primaryColor,
      logo_url: "",
      stripe_account_id: "",
      contact_email: ownerEmail,
      stripe_onboarding_url: "",
    });

  if (insertError) {
    // Slug uniqueness violation
    if (
      insertError.message?.includes("duplicate") ||
      insertError.code === "23505"
    ) {
      return NextResponse.json(
        { error: "This slug is already taken" },
        { status: 400 },
      );
    }
    console.error("Signup org insert failed:", insertError);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // ---------- Stripe Connect ----------

  let stripeAccountId: string;
  let stripeOnboardingUrl: string;

  try {
    const stripe = getStripe();

    const account = await stripe.accounts.create({
      type: "express",
      email: ownerEmail,
      metadata: { org_id: orgId, slug },
    });
    stripeAccountId = account.id;

    const origin = getOrigin(req);
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      type: "account_onboarding",
      refresh_url: `${origin}/signup/stripe-refresh?org=${slug}`,
      return_url: `${origin}/${slug}/admin?onboarded=1`,
    });
    stripeOnboardingUrl = accountLink.url;

    // Update org row with Stripe IDs
    await supabase
      .from("organizations")
      .update({
        stripe_account_id: stripeAccountId,
        stripe_onboarding_url: stripeOnboardingUrl,
      })
      .eq("id", orgId);
  } catch (err) {
    console.error("Signup Stripe setup failed for org", orgId, err);
    // Mark org as failed but don't delete (audit trail)
    await supabase
      .from("organizations")
      .update({ onboarding_state: "failed" })
      .eq("id", orgId);

    return NextResponse.json(
      { error: "Something went wrong setting up payments. Please contact support." },
      { status: 500 },
    );
  }

  // ---------- Seed defaults ----------

  try {
    // Placeholder team
    await supabase.from("teams").insert({
      id: makeId("TEAM"),
      org_id: orgId,
      name: "Team 1",
      season: "",
      program: "",
      active: true,
    });

    // Placeholder news post
    await supabase.from("news_posts").insert({
      id: makeId("NEWS"),
      org_id: orgId,
      title: `Welcome to ${name} on Fieldday`,
      body: "This is your first announcement. Edit or delete from the admin dashboard.",
      active: true,
    });
  } catch (err) {
    // Seeding failure is non-critical — log but don't fail signup
    console.error("Signup seed failed for org", orgId, err);
  }

  // ---------- Issue JWT ----------

  const token = createAdminToken(orgId);

  const res = NextResponse.json(
    {
      ok: true,
      orgId,
      slug,
      stripeOnboardingUrl,
      token,
    },
    { status: 201 },
  );

  // Set httpOnly admin cookie
  res.cookies.set("fieldday_admin", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });

  return res;
}
