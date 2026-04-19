import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendPaymentConfirmation, sendPaymentFailed } from "@/lib/email";
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
  } else if (
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "payment_intent.payment_failed"
  ) {
    await handlePaymentFailed(event);
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

/**
 * Handle a failed payment — mark any pending payment row failed, then
 * email the participant with a retry link back to the checkout page.
 *
 * Triggered by either:
 *   - `checkout.session.async_payment_failed` (ACH / delayed failures)
 *   - `payment_intent.payment_failed` (sync card declines)
 */
async function handlePaymentFailed(event: Stripe.Event) {
  // Both event types expose metadata, but on different shapes.
  let registrationId: string | undefined;
  let orgId: string | undefined;
  let amountCents = 0;
  let stripeSessionId: string | undefined;
  let failureReason: string | undefined;

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    registrationId = session.metadata?.registrationId;
    orgId = session.metadata?.orgId;
    amountCents = session.amount_total || 0;
    stripeSessionId = session.id;
    failureReason = "Your bank declined the payment. Please try a different card.";
  } else if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    registrationId = pi.metadata?.registrationId;
    orgId = pi.metadata?.orgId;
    amountCents = pi.amount || 0;
    // last_payment_error.message is human-readable (e.g., "Your card was declined.")
    failureReason = pi.last_payment_error?.message;
  }

  if (!registrationId) {
    console.warn(
      `[stripe-webhook] ${event.type} without registrationId in metadata`
    );
    return;
  }

  const sb = getSupabaseServer();

  // Mark any pending payment row failed so the admin UI reflects reality.
  if (stripeSessionId) {
    await sb
      .from("payments")
      .update({ status: "failed" })
      .eq("stripe_session_id", stripeSessionId);
  }

  // Fire-and-forget: email the participant a retry link.
  (async () => {
    try {
      const { data: reg } = await sb
        .from("registrations")
        .select("id, email, full_name, signup_type, session_id, org_id")
        .eq("id", registrationId)
        .single();
      if (!reg?.email) return;

      const resolvedOrgId = orgId || reg.org_id;
      if (!resolvedOrgId) return;

      const { data: org } = await sb
        .from("organizations")
        .select("name, slug, primary_color, contact_email")
        .eq("id", resolvedOrgId)
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

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://fieldday.app";
      const retryUrl = `${appUrl}/${org.slug}/checkout?reg=${reg.id}`;

      await sendPaymentFailed(
        reg.email,
        reg.full_name,
        sessionName,
        amountCents,
        retryUrl,
        {
          name: org.name,
          slug: org.slug,
          primaryColor: org.primary_color,
          contactEmail: org.contact_email,
        },
        failureReason
      );
    } catch (emailErr) {
      console.error("[stripe-webhook] Payment failed email failed:", emailErr);
    }
  })();
}
