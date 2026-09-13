import { NextRequest, NextResponse } from "next/server";

/**
 * Landing-page funnel tracking. Fire-and-forget: client uses sendBeacon
 * so a failed write never blocks the UI, and we always 200 (even on
 * validation errors) so the client doesn't retry. Supabase unconfigured
 * → log + 200, same as /api/demo.
 */

export const VALID_EVENT_TYPES = [
  "page_view_home",
  "page_view_demo",
  "form_start",
  "form_submit_success",
  "form_submit_error",
] as const;

type EventType = (typeof VALID_EVENT_TYPES)[number];

interface TrackBody {
  session_id?: string;
  event_type?: string;
  path?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}

const MAX_STR = 500;
const MAX_METADATA_BYTES = 2_000;

function clamp(s: unknown, max = MAX_STR): string {
  if (typeof s !== "string") return "";
  return s.slice(0, max);
}

export async function POST(req: NextRequest) {
  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const session_id = clamp(body.session_id, 100).trim();
  const event_type = clamp(body.event_type, 64).trim();

  if (!session_id || !event_type) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  if (!VALID_EVENT_TYPES.includes(event_type as EventType)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  let metadata: Record<string, unknown> = {};
  if (body.metadata && typeof body.metadata === "object") {
    try {
      const serialized = JSON.stringify(body.metadata);
      if (serialized.length <= MAX_METADATA_BYTES) {
        metadata = body.metadata;
      }
    } catch {
      metadata = {};
    }
  }

  const row = {
    session_id,
    event_type,
    path: clamp(body.path, 200),
    referrer: clamp(body.referrer, 500),
    user_agent: clamp(req.headers.get("user-agent") ?? "", 500),
    metadata,
  };

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const { getSupabaseServer } = await import("@/lib/supabase/server");
      const supabase = getSupabaseServer();
      const { error } = await supabase.from("funnel_events").insert(row);
      if (error) {
        console.warn("[track] insert failed:", error.message);
      }
    } catch (err) {
      console.warn("[track] supabase client error:", err);
    }
  } else {
    console.log("[track] supabase not configured — logging only:", row);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
