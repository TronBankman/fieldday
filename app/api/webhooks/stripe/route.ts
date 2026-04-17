import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendPaymentConfirmation } from "@/lib/email";
import Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler. Listens for checkout.session.completed
 * events and marks registrations as paid.
 *
 * For connected accounts, Stripe sends the event with an `account`
 * field. The webhook secret should be the Connect endpoint secret
 * if using connected accounts, or the regular endpoint secret for
 * direct charges.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const registrationId = session.metadata?.registrationId;
  const orgId = session.metadata?.orgId;
  const planType = session.metadata?.planType || "full";

  if (!registrationId) {
    console.warn("[stripe-webhook] checkout.session.completed without registrationId in metadata");
    return;
  }

  const sb = getSupabaseServer();
  const amountPaid = session.amount_total || 0;

  // Update the payment record
  await sb
    .from("payments")
    .update({ status: "paid" })
    .eq("stripe_session_id", session.id);

  if (planType === "full") {
    // Full payment — mark registration as fully paid
    const updateData: Record<string, unknown> = {
      paid_status: "Yes",
      amount_paid: amountPaid,
      payment_method: "stripe",
    };

    const query = sb
      .from("registrations")
      .update(updateData)
      .eq("id", registrationId);

    // Scope to org if available
    if (orgId) {
      query.eq("org_id", orgId);
    }

    const { error } = await query;
    if (error) {
      console.error("[stripe-webhook] Failed to update registration:", error.message);
    }
  } else if (planType === "deposit") {
    // Deposit — add to amount_paid but don't mark as fully paid
    const { data: reg } = await sb
      .from("registrations")
      .select("amount_paid, amount_due")
      .eq("id", registrationId)
      .single();

    const prevPaid = reg?.amount_paid || 0;
    const newTotal = prevPaid + amountPaid;
    const totalDue = reg?.amount_due || 0;

    const updateData: Record<string, unknown> = {
      amount_paid: newTotal,
      payment_method: "stripe",
    };

    // If the new total covers the full amount, mark as paid
    if (newTotal >= totalDue && totalDue > 0) {
      updateData.paid_status = "Yes";
    }

    const query = sb
      .from("registrations")
      .update(updateData)
      .eq("id", registrationId);

    if (orgId) {
      query.eq("org_id", orgId);
    }

    const { error } = await query;
    if (error) {
      console.error("[stripe-webhook] Failed to update registration (deposit):", error.message);
    }

    // Update payment plan
    await sb
      .from("payment_plans")
      .update({ installments_paid: 1 })
      .eq("registration_id", registrationId)
      .eq("status", "active");
  }

  // Fire-and-forget: send payment confirmation / receipt email
  (async () => {
    try {
      const { data: reg } = await sb
        .from("registrations")
        .select("email, full_name, signup_type, session_id")
        .eq("id", registrationId)
        .single();
      if (!reg?.email || !orgId) return;

      const { data: org } = await sb
        .from("organizations")
        .select("name, slug, primary_color, contact_email")
        .eq("id", orgId)
        .single();
      if (!org) return;

      let sessionName = reg.signup_type || "";
      if (reg.session_id) {
        const { data: ses } = await sb
          .from("sessions")
          .select("name")
          .eq("id", reg.session_id)
          .single();
        if (ses?.name) sessionName = ses.name;
      }

      await sendPaymentConfirmation(
        reg.email,
        reg.full_name,
        sessionName,
        amountPaid,
        {
          name: org.name,
          slug: org.slug,
          primaryColor: org.primary_color,
          contactEmail: org.contact_email,
        },
        { receiptId: session.id }
      );
    } catch (emailErr) {
      console.error("[stripe-webhook] Payment confirmation email failed:", emailErr);
    }
  })();
}
