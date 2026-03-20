import { NextRequest, NextResponse } from "next/server";

/**
 * Org proxy — runs on every /[org]/* route.
 *
 * For each request to a dynamic org path:
 * 1. Extract the slug from the URL.
 * 2. Validate the slug format (lowercase alphanumeric + hyphens, 1–64 chars).
 * 3. Look up the org in Supabase via the REST API (Edge-compatible fetch).
 * 4. If not found → 404.
 * 5. If found → inject org metadata as request headers for downstream
 *    server components and API routes.
 */

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

// Paths that are NOT org routes (exact or prefix matches)
const NON_ORG_PREFIXES = ["/api/", "/demo", "/_next/", "/favicon"];

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - /_next/ (Next.js internals)
     * - /api/   (existing API routes)
     * - /favicon.ico
     * - / (root landing page — no org segment)
     * - /demo  (Fieldday's own demo page)
     */
    "/((?!_next|api|favicon|demo$).*)",
  ],
};

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  sport: string;
  primary_color: string;
  logo_url: string;
  stripe_account_id: string;
  contact_email: string;
}

async function lookupOrg(slug: string): Promise<OrgRow | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    // No Supabase configured — skip DB lookup (useful in test/build environments)
    return null;
  }

  const url = `${supabaseUrl}/rest/v1/organizations?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`;

  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/json",
    },
    // Cache for 60s at the edge to reduce DB round-trips
    next: { revalidate: 60 },
  });

  if (!res.ok) return null;

  const rows = (await res.json()) as OrgRow[];
  return rows[0] ?? null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip non-org paths quickly
  for (const prefix of NON_ORG_PREFIXES) {
    if (pathname.startsWith(prefix)) return NextResponse.next();
  }

  // Extract the first path segment — that's the org slug
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return NextResponse.next(); // root "/"

  const slug = parts[0];

  // Fast fail on malformed slugs (prevents DB lookup for paths like "_next")
  if (!SLUG_RE.test(slug)) {
    return NextResponse.next(); // not an org route, pass through
  }

  // Look up the org
  const org = await lookupOrg(slug);

  if (!org) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Inject org context as headers for server components and API routes
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-fieldday-org-id", org.id);
  requestHeaders.set("x-fieldday-org-name", org.name);
  requestHeaders.set("x-fieldday-org-slug", org.slug);
  requestHeaders.set("x-fieldday-org-sport", org.sport);
  requestHeaders.set("x-fieldday-org-color", org.primary_color);
  requestHeaders.set("x-fieldday-org-logo", org.logo_url);
  requestHeaders.set("x-fieldday-org-email", org.contact_email);
  requestHeaders.set("x-fieldday-org-stripe", org.stripe_account_id);

  return NextResponse.next({ request: { headers: requestHeaders } });
}
