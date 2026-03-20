import { NextRequest, NextResponse } from "next/server";

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

  // In production, this would save to a database or send an email notification.
  // For now, log the submission and return success.
  console.log("[demo] New demo request:", {
    name: name.trim(),
    org: org.trim(),
    email: email.trim(),
    sport,
    currentTool: currentTool?.trim() ?? "",
    submittedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
