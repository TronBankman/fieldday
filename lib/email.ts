/**
 * Resend-based email notifications, ported from Falcons.
 *
 * All senders return `{ success, error? }` and fail silently (logging to
 * console) if RESEND_API_KEY is not set — so local dev without Resend
 * doesn't break flows.
 */

function getResendApiKey(): string {
  return process.env.RESEND_API_KEY || "";
}
function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "Field Day <noreply@fieldday.app>";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping send to", to);
    return { success: false, error: "Email service not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: getFromEmail(), to: [to], subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend API error:", res.status, body);
      return { success: false, error: "Failed to send email" };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Send error:", err);
    return { success: false, error: "Failed to send email" };
  }
}

/**
 * Org-branded email wrapper. Uses the org's name and primary color
 * so each org's emails feel like their own brand, not generic.
 */
function emailWrapper(
  content: string,
  orgName: string,
  primaryColor = "#2563eb"
): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; color: #1a1a1a; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 4px; color: ${primaryColor};">${esc(orgName)}</h1>
  <p style="font-size: 12px; color: #999; margin: 0 0 24px;">Powered by Field Day</p>
  ${content}
  <p style="font-size: 12px; color: #999; margin: 28px 0 0; border-top: 1px solid #e5e7eb; padding-top: 16px;">
    This email was sent via <a href="https://fieldday.app" style="color: ${primaryColor}; text-decoration: none;">Field Day</a>.
  </p>
</div>`;
}

function btn(label: string, url: string, color = "#2563eb"): string {
  return `<a href="${url}" style="display: inline-block; background: ${color}; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px;">${esc(label)}</a>`;
}

export interface OrgContext {
  name: string;
  slug: string;
  primaryColor?: string;
  contactEmail?: string;
}

/**
 * Confirmation email sent to participant after successful registration.
 */
export async function sendRegistrationConfirmation(
  to: string,
  participantName: string,
  sessionName: string,
  org: OrgContext
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fieldday.app";
  const color = org.primaryColor || "#2563eb";

  const html = emailWrapper(
    `<p style="font-size: 15px; color: #666; margin: 0 0 20px;">Registration Received</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
      Hi ${esc(participantName)}, thanks for registering${sessionName ? ` for <strong>${esc(sessionName)}</strong>` : ""} with ${esc(org.name)}!
    </p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Your registration is being reviewed. We'll send you another email once you've been approved.
    </p>
    ${btn("View Your Account", `${appUrl}/${org.slug}/player`, color)}
    <p style="font-size: 13px; color: #888; margin: 20px 0 0; line-height: 1.5;">
      If you have questions, reply to this email or contact ${esc(org.name)} directly.
    </p>`,
    org.name,
    color
  );

  return sendEmail(to, `Registration received — ${org.name}`, html);
}

/**
 * Notification email sent to the org admin when a new registration arrives.
 */
export async function sendAdminNewRegistration(
  participantName: string,
  participantEmail: string,
  sessionName: string,
  org: OrgContext
): Promise<{ success: boolean; error?: string }> {
  const adminEmail = org.contactEmail;
  if (!adminEmail) {
    return { success: false, error: "No admin contact email configured" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fieldday.app";
  const color = org.primaryColor || "#2563eb";

  const html = emailWrapper(
    `<p style="font-size: 15px; color: #666; margin: 0 0 20px;">New Registration</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
      <strong>${esc(participantName)}</strong> just registered${sessionName ? ` for <strong>${esc(sessionName)}</strong>` : ""}.
    </p>
    <p style="font-size: 14px; color: #666; margin: 0 0 24px;">
      Email: ${esc(participantEmail)}
    </p>
    ${btn("Review Registrations", `${appUrl}/${org.slug}/admin/registrations`, color)}`,
    org.name,
    color
  );

  return sendEmail(
    adminEmail,
    `New registration: ${participantName}`,
    html
  );
}

/**
 * Payment confirmation / receipt sent after successful Stripe checkout.
 * Includes amount, session name, payment date, and a link back to the
 * participant's account so they can see their full payment history.
 */
export async function sendPaymentConfirmation(
  to: string,
  participantName: string,
  sessionName: string,
  amountCents: number,
  org: OrgContext,
  opts: { receiptId?: string; paidAt?: Date } = {}
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fieldday.app";
  const color = org.primaryColor || "#2563eb";
  const dollars = (amountCents / 100).toFixed(2);
  const paidAt = opts.paidAt || new Date();
  const paidAtStr = paidAt.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const receiptRow = opts.receiptId
    ? `<tr><td style="padding: 6px 0; color: #888;">Receipt ID</td><td style="padding: 6px 0; font-family: ui-monospace, Menlo, monospace; font-size: 13px;">${esc(opts.receiptId)}</td></tr>`
    : "";

  const html = emailWrapper(
    `<p style="font-size: 15px; color: #666; margin: 0 0 20px;">Payment Confirmed</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
      Hi ${esc(participantName)}, we've received your payment${sessionName ? ` for <strong>${esc(sessionName)}</strong>` : ""}. Keep this email as your receipt.
    </p>
    <table style="width: 100%; margin: 0 0 24px; font-size: 14px; color: #333; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; color: #888; width: 110px;">Amount</td><td style="padding: 6px 0; font-weight: 700; color: ${color};">$${dollars} CAD</td></tr>
      <tr><td style="padding: 6px 0; color: #888;">Date</td><td style="padding: 6px 0;">${paidAtStr}</td></tr>
      ${sessionName ? `<tr><td style="padding: 6px 0; color: #888;">Session</td><td style="padding: 6px 0;">${esc(sessionName)}</td></tr>` : ""}
      ${receiptRow}
    </table>
    ${btn("View Your Account", `${appUrl}/${org.slug}/player`, color)}
    <p style="font-size: 13px; color: #888; margin: 20px 0 0; line-height: 1.5;">
      Questions? Reply to this email or contact ${esc(org.name)} directly.
    </p>`,
    org.name,
    color
  );

  return sendEmail(
    to,
    `Payment confirmed — $${dollars} — ${org.name}`,
    html
  );
}

/**
 * Sent when a Stripe payment fails (card declined, insufficient funds,
 * bank debit bounced, etc.). Points the participant back at the
 * checkout page to retry. `failureReason` is a short human-readable
 * hint surfaced to the user — never include raw Stripe error codes.
 */
export async function sendPaymentFailed(
  to: string,
  participantName: string,
  sessionName: string,
  amountCents: number,
  retryUrl: string,
  org: OrgContext,
  failureReason?: string
): Promise<{ success: boolean; error?: string }> {
  const color = org.primaryColor || "#2563eb";
  const dollars = (amountCents / 100).toFixed(2);

  const reasonBlock = failureReason
    ? `<p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px; padding: 12px 14px; background: #fff5f5; border-left: 3px solid #dc2626; color: #991b1b;">
        ${esc(failureReason)}
      </p>`
    : "";

  const html = emailWrapper(
    `<p style="font-size: 15px; color: #666; margin: 0 0 20px;">Payment Didn't Go Through</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
      Hi ${esc(participantName)}, we tried to process your payment of
      <strong>$${dollars} CAD</strong>${sessionName ? ` for <strong>${esc(sessionName)}</strong>` : ""}, but it didn't go through.
    </p>
    ${reasonBlock}
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Your spot is still being held. Tap below to try again with a
      different card or payment method.
    </p>
    ${btn("Retry Payment", retryUrl, color)}
    <p style="font-size: 13px; color: #888; margin: 20px 0 0; line-height: 1.5;">
      If you keep running into trouble, reply to this email or contact
      ${esc(org.name)} directly.
    </p>`,
    org.name,
    color
  );

  return sendEmail(
    to,
    `Payment issue — please retry — ${org.name}`,
    html
  );
}
