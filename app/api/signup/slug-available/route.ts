import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9-]+$/;
const SLUG_MIN = 3;
const SLUG_MAX = 40;

const RESERVED_SLUGS = new Set([
  "api",
  "signup",
  "login",
  "demo",
  "admin",
  "www",
  "app",
  "assets",
  "_next",
  "favicon",
]);

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim() ?? "";

  if (
    !slug ||
    slug.length < SLUG_MIN ||
    slug.length > SLUG_MAX ||
    !SLUG_RE.test(slug)
  ) {
    return NextResponse.json(
      { available: false, reason: "invalid_format" },
      { status: 200 },
    );
  }

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json(
      { available: false, reason: "reserved" },
      { status: 200 },
    );
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { available: false, reason: "error" },
      { status: 500 },
    );
  }

  if (data) {
    return NextResponse.json(
      { available: false, reason: "taken" },
      { status: 200 },
    );
  }

  return NextResponse.json({ available: true }, { status: 200 });
}
