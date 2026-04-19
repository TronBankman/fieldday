import { NextRequest, NextResponse } from "next/server";
import { makeId } from "@/lib/id";
import { sendAdminDemoRequest, sendDemoRequestConfirmation } from "@/lib/email";

/**
 * Landing page for cold outreach — this endpoint is the conversion
 * surface for every prospect we email. Two side effects on success:
 *   1. Row in `demo_requests` (permanent record)
 *   2. Admin alert email via Resend (so the owner can reply in minutes)
 *
 * If Supabase is not configured we still 200 and fire the email —
 * losing a lead is worse than losing a log row.
 */

interface DemoRequestBody {
  businessName?: string;
  businessType?: string;
  activeClients?: number | string | null;
  currentTool?: string;
  email?: string;
  phone?: string;
}

export const VALID_BUSINESS_TYPES = [
  "gym",
  "martial_arts",
  "tennis",
  "hockey",
  "dance",
  "tutoring",
  "other",
] as const;

function parseActiveClients(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return NaN;
  return Math.floor(n);
}

export async function POST(req: NextRequest) {
  let body: DemoRequestBody;
  try {
    body = (await req.json()) as DemoRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const businessName = (body.businessName ?? "").toString().trim();
  const businessType = (body.businessType ?? "").toString().trim();
  const currentTool = (body.currentTool ?? "").toString().trim();
  const email = (body.email ?? "").toString().trim();
  const phone = (body.phone ?? "").toString().trim();

  if (!businessName) {
    return NextResponse.json(
      { error: "Business name is required" },
      { status: 400 }
    );
  }
  if (!businessType || !VALID_BUSINESS_TYPES.includes(businessType as typeof VALID_BUSINESS_TYPES[number])) {
    return NextResponse.json(
      { error: "Please select a business type" },
      { status: 400 }
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "A valid email address is required" },
      { status: 400 }
    );
  }

  const activeClients = parseActiveClients(body.activeClients);
  if (Number.isNaN(activeClients)) {
    return NextResponse.json(
      { error: "Active clients must be a non-negative number" },
      { status: 400 }
    );
  }

  // Hard caps — cold-outreach forms are a spam target.
  if (businessName.length > 200 || currentTool.length > 200 || phone.length > 40) {
    return NextResponse.json(
      { error: "One or more fields are too long" },
      { status: 400 }
    );
  }

  const id = makeId("DEMO");
  const row = {
    id,
    business_name: businessName,
    business_type: businessType,
    active_clients: activeClients,
    current_tool: currentTool,
    email,
    phone,
  };

  // 1. Persist to Supabase. If unconfigured, log + continue so email still fires.
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
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
      console.log("[demo] Saved to Supabase:", id);
    } catch (err) {
      console.error("[demo] Supabase client error:", err);
      return NextResponse.json(
        { error: "Failed to save your request. Please try again." },
        { status: 500 }
      );
    }
  } else {
    console.log("[demo] Supabase not configured — logging only:", row);
  }

  // 2. Admin alert + user confirmation — fire and forget. Lead is already
  //    persisted; email failures must not 500 the user. Run both in
  //    parallel since they're independent Resend API calls.
  const [adminResult, userResult] = await Promise.allSettled([
    sendAdminDemoRequest({
      id,
      businessName,
      businessType,
      activeClients,
      currentTool,
      email,
      phone,
    }),
    sendDemoRequestConfirmation(email, businessName),
  ]);

  if (adminResult.status === "rejected") {
    console.error("[demo] Admin alert threw:", adminResult.reason);
  } else if (!adminResult.value.success) {
    console.warn("[demo] Admin alert failed:", adminResult.value.error);
  }

  if (userResult.status === "rejected") {
    console.error("[demo] User confirmation threw:", userResult.reason);
  } else if (!userResult.value.success) {
    console.warn("[demo] User confirmation failed:", userResult.value.error);
  }

  return NextResponse.json({ ok: true, id }, { status: 200 });
}
