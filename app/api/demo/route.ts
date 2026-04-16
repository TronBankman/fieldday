import { NextRequest, NextResponse } from "next/server";
import { makeId } from "@/lib/id";

interface DemoRequest {
  name: string;
  org: string;
  email: string;
  sport: string;
  currentTool?: string;
}

const VALID_SPORTS = [
  "hockey",
  "soccer",
  "lacrosse",
  "basketball",
  "baseball",
  "volleyball",
  "softball",
  "football",
  "other",
];

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, org, email, sport, currentTool } = body as DemoRequest;

  // Validate required fields
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!org || typeof org !== "string" || org.trim().length === 0) {
    return NextResponse.json(
      { error: "Organization name is required" },
      { status: 400 }
    );
  }
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "A valid email address is required" },
      { status: 400 }
    );
  }
  if (!sport || !VALID_SPORTS.includes(sport)) {
    return NextResponse.json({ error: "Please select a sport" }, { status: 400 });
  }

  const row = {
    id: makeId("DEMO"),
    name: name.trim(),
    org: org.trim(),
    email: email.trim(),
    sport,
    current_tool: currentTool?.trim() ?? "",
  };

  // Persist to Supabase if configured, otherwise log only
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    const { getSupabaseServer } = await import("@/lib/supabase/server");
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("demo_requests").insert(row);

    if (error) {
      console.error("[demo] Supabase insert failed:", error.message);
      return NextResponse.json(
        { error: "Failed to save your request. Please try again." },
        { status: 500 }
      );
    }
    console.log("[demo] Saved to Supabase:", row.id);
  } else {
    console.log("[demo] Supabase not configured — logging only:", row);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
