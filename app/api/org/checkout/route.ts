import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveOrgId } from "@/lib/resolve-org";
import { makeId } from "@/lib/id";

/**
 * POST /api/org/checkout
 *
 * Creates a Stripe Checkout session for a registration payment.
 * Uses the org's connected Stripe account if configured.
 *
 * Body: { registrationId: string, planType?: "full" | "deposit" }
 */
export async function POST(req: NextRequest) {
  const orgId = await resolveOrgId(req);
  if (!orgId) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  let body: { registrationId?: string; planType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { registrationId, planType = "full" } = body;

  if (!registrationId || typeof registrationId !== "string") {
    return NextResponse.json(
      { error: "registrationId is required" },
      { status: 400 }
    );
  }

  if (planType !== "full" && planType !== "deposit") {
    return NextResponse.json(
      { error: "planType must be 'full' or 'deposit'" },
      { status: 400 }
    );
  }

  try {
    const sb = getSupabaseServer();

    // Look up the org for its Stripe connected account
    const { data: org } = await sb
      .from("organizations")
      .select("id, name, stripe_account_id")
      .eq("id", orgId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Look up the registration — must belong to this org
    const { data: reg } = await sb
      .from("registrations")
      .select("*")
      .eq("id", registrationId)
      .eq("org_id", orgId)
      .single();

    if (!reg) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    if (reg.paid_status === "Yes") {
      return NextResponse.json(
        { error: "This registration is already paid" },
        { status: 400 }
      );
    }

    // Server-side price validation: use the session's price as source of truth
    let amountDue = reg.amount_due || 0;

    if (reg.session_id) {
      const { data: session } = await sb
        .from("sessions")
        .select("price, allow_installments, installment_count")
        .eq("id", reg.session_id)
        .single();

      if (session) {
        // Use the session price as the canonical amount
        amountDue = session.price || amountDue;
      }
    }

    // Subtract what's already been paid
    const amountPaid = reg.amount_paid || 0;
    const amountRemaining = amountDue - amountPaid;

    if (amountRemaining <= 0) {
      return NextResponse.json(
        { error: "No amount remaining for this registration" },
        { status: 400 }
      );
    }

    // Calculate charge amount based on plan type
    let chargeAmount = amountRemaining;
    let description = `${org.name} — ${reg.signup_type || "Registration"}`;

    if (planType === "deposit") {
      chargeAmount = Math.ceil(amountRemaining / 3);
      description += " (Deposit)";
    }

    if (chargeAmount <= 0) {
      return NextResponse.json(
        { error: "Calculated charge amount is zero" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const orgSlug =
      req.headers.get("x-fieldday-org-slug") || orgId;

    // Build Stripe Checkout session params
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: { name: description },
            unit_amount: chargeAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        registrationId,
        orgId,
        planType,
      },
      success_url: `${appUrl}/${orgSlug}/checkout/result?status=success&reg=${registrationId}`,
      cancel_url: `${appUrl}/${orgSlug}/checkout/result?status=cancelled&reg=${registrationId}`,
    };

    // If the org has a connected Stripe account, use it
    if (org.stripe_account_id) {
      sessionParams.stripe_account = org.stripe_account_id;
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

    // Record the pending payment
    await sb.from("payments").insert({
      id: makeId("PAY"),
      org_id: orgId,
      registration_id: registrationId,
      amount: chargeAmount,
      method: "stripe",
      status: "pending",
      stripe_session_id: checkoutSession.id,
    });

    // If deposit, create payment plan
    if (planType === "deposit") {
      const today = new Date();
      const nextDue = new Date(today);
      nextDue.setDate(nextDue.getDate() + 30);

      await sb.from("payment_plans").insert({
        id: makeId("PLAN"),
        org_id: orgId,
        registration_id: registrationId,
        total_amount: amountRemaining,
        deposit_amount: chargeAmount,
        num_installments: 2,
        installments_paid: 0,
        next_due_date: nextDue.toISOString().split("T")[0],
        status: "active",
      });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[org/checkout] Error:", message);
    return NextResponse.json(
      { error: "Unable to create checkout session" },
      { status: 500 }
    );
  }
}
