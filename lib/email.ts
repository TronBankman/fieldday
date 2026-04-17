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
