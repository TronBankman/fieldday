#!/usr/bin/env tsx
/**
 * FieldDay cold-email outreach — daily batch sender.
 *
 * Intended cadence: invoked by openclaw-agent's scheduler at 9:07am PST
 * on weekdays (Mon-Fri).
 *
 * Gate: this script is a no-op unless FIELDDAY_OUTREACH_ENABLED === "true".
 * The owner flips that env var only after the Resend account is signed up,
 * the sending domain is verified, and the target list + copy have been
 * reviewed.
 *
 * Rate limit: DAILY_CAP hard-caps how many emails can be sent per run.
 *
 * When the flag is off (the default), the script logs its state and exits 0
 * so the cron reports success rather than spamming failures into Telegram.
 */
import process from "node:process";

const DAILY_CAP = 5;

interface RunSummary {
  enabled: boolean;
  attempted: number;
  sent: number;
  skipped: number;
  errors: string[];
}

function log(line: string): void {
  // Prefix every line so the scheduler's captured output is easy to grep.
  process.stdout.write(`[fieldday-outreach] ${line}\n`);
}

async function loadTodayBatch(_cap: number): Promise<unknown[]> {
  // TODO(owner-setup): wire to the actual lead source once it exists.
  // Candidate sources: a Supabase table `outreach_leads`, a CSV in
  // fieldday/data/outreach/, or a Resend audience export. Until that
  // source is picked, return an empty batch so enabling the flag alone
  // cannot accidentally send anything.
  return [];
}

async function sendOne(_lead: unknown): Promise<void> {
  // TODO(owner-setup): implement Resend send once the API key + verified
  // sending domain exist. Each call should:
  //   1. Render the template for this lead
  //   2. Call resend.emails.send({ from, to, subject, html })
  //   3. Record the send in Supabase (outreach_sends) with message_id
  //   4. Throw on failure so the caller counts it as an error
  throw new Error("Resend integration not yet implemented — see TODO");
}

async function run(): Promise<RunSummary> {
  const enabled = process.env.FIELDDAY_OUTREACH_ENABLED === "true";
  const summary: RunSummary = {
    enabled,
    attempted: 0,
    sent: 0,
    skipped: 0,
    errors: [],
  };

  if (!enabled) {
    log("FIELDDAY_OUTREACH_ENABLED is not 'true' — skipping send. No emails go out until owner flips the flag.");
    return summary;
  }

  if (!process.env.RESEND_API_KEY) {
    log("FIELDDAY_OUTREACH_ENABLED is true but RESEND_API_KEY is missing — refusing to send.");
    summary.errors.push("missing RESEND_API_KEY");
    return summary;
  }

  const batch = await loadTodayBatch(DAILY_CAP);
  const toSend = batch.slice(0, DAILY_CAP);
  summary.skipped = batch.length - toSend.length;

  log(`Flag is ON. Batch size: ${batch.length}. Sending up to ${DAILY_CAP}.`);

  for (const lead of toSend) {
    summary.attempted += 1;
    try {
      await sendOne(lead);
      summary.sent += 1;
    } catch (err) {
      summary.errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  log(`Done. attempted=${summary.attempted} sent=${summary.sent} skipped=${summary.skipped} errors=${summary.errors.length}`);
  return summary;
}

run()
  .then((summary) => {
    // Emit a final machine-readable line so the scheduler can surface stats.
    process.stdout.write(`SUMMARY ${JSON.stringify(summary)}\n`);
    // Any error in the send loop has been logged but is non-fatal for the
    // cron — we exit 0 unless setup itself failed above.
    process.exit(0);
  })
  .catch((err) => {
    log(`fatal: ${err instanceof Error ? err.stack || err.message : String(err)}`);
    process.exit(1);
  });
