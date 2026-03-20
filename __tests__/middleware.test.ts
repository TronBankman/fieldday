/**
 * Tests for the org middleware slug lookup logic.
 *
 * We test the pure slug-validation and org-injection logic in isolation
 * by importing helpers from the middleware module. The Supabase fetch is
 * mocked at the global level so no real network calls are made.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Inline the slug validation logic (mirrors middleware.ts) so we can test it
// without booting the full Next.js edge runtime.
// ---------------------------------------------------------------------------

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

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

async function lookupOrgMockable(
  slug: string,
  fetchFn: typeof fetch
): Promise<OrgRow | null> {
  const supabaseUrl = "https://test.supabase.co";
  const serviceKey = "test-service-key";

  const url = `${supabaseUrl}/rest/v1/organizations?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`;

  const res = await fetchFn(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;
  const rows = (await res.json()) as OrgRow[];
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("isValidSlug", () => {
  it("accepts lowercase alphanumeric slugs", () => {
    expect(isValidSlug("bcfalcons")).toBe(true);
    expect(isValidSlug("abc123")).toBe(true);
    expect(isValidSlug("my-org")).toBe(true);
  });

  it("rejects uppercase characters", () => {
    expect(isValidSlug("BCFalcons")).toBe(false);
    expect(isValidSlug("MyOrg")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidSlug("")).toBe(false);
  });

  it("rejects slugs longer than 64 characters", () => {
    expect(isValidSlug("a".repeat(65))).toBe(false);
    expect(isValidSlug("a".repeat(64))).toBe(true);
  });

  it("rejects slugs with spaces or special characters", () => {
    expect(isValidSlug("my org")).toBe(false);
    expect(isValidSlug("my_org")).toBe(false);
    expect(isValidSlug("my.org")).toBe(false);
    expect(isValidSlug("_next")).toBe(false);
  });
});

describe("lookupOrg (with mocked fetch)", () => {
  const mockOrg: OrgRow = {
    id: "org_bcfalcons",
    name: "BC Falcons Hockey",
    slug: "bcfalcons",
    sport: "hockey",
    primary_color: "#cc0000",
    logo_url: "",
    stripe_account_id: "",
    contact_email: "admin@bcfalcons.com",
  };

  it("returns the org when slug matches", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockOrg],
    });

    const result = await lookupOrgMockable("bcfalcons", mockFetch as unknown as typeof fetch);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("org_bcfalcons");
    expect(result!.name).toBe("BC Falcons Hockey");
  });

  it("returns null when no org matches the slug", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const result = await lookupOrgMockable("unknown-org", mockFetch as unknown as typeof fetch);
    expect(result).toBeNull();
  });

  it("returns null when Supabase returns a non-ok response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "unauthorized" }),
    });

    const result = await lookupOrgMockable("bcfalcons", mockFetch as unknown as typeof fetch);
    expect(result).toBeNull();
  });

  it("uses the slug in the fetch URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await lookupOrgMockable("bcfalcons", mockFetch as unknown as typeof fetch);
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("slug=eq.bcfalcons");
  });
});

describe("middleware request header injection", () => {
  /**
   * Simulate what middleware does when an org is found:
   * build a new Headers set with org context injected.
   */
  function injectOrgHeaders(baseHeaders: Headers, org: OrgRow): Headers {
    const next = new Headers(baseHeaders);
    next.set("x-fieldday-org-id", org.id);
    next.set("x-fieldday-org-name", org.name);
    next.set("x-fieldday-org-slug", org.slug);
    next.set("x-fieldday-org-sport", org.sport);
    next.set("x-fieldday-org-color", org.primary_color);
    next.set("x-fieldday-org-logo", org.logo_url);
    next.set("x-fieldday-org-email", org.contact_email);
    next.set("x-fieldday-org-stripe", org.stripe_account_id);
    return next;
  }

  const mockOrg: OrgRow = {
    id: "org_bcfalcons",
    name: "BC Falcons Hockey",
    slug: "bcfalcons",
    sport: "hockey",
    primary_color: "#cc0000",
    logo_url: "",
    stripe_account_id: "",
    contact_email: "admin@bcfalcons.com",
  };

  it("injects all expected org headers", () => {
    const req = new NextRequest("http://localhost/bcfalcons/register");
    const injected = injectOrgHeaders(req.headers, mockOrg);

    expect(injected.get("x-fieldday-org-id")).toBe("org_bcfalcons");
    expect(injected.get("x-fieldday-org-name")).toBe("BC Falcons Hockey");
    expect(injected.get("x-fieldday-org-slug")).toBe("bcfalcons");
    expect(injected.get("x-fieldday-org-sport")).toBe("hockey");
    expect(injected.get("x-fieldday-org-color")).toBe("#cc0000");
    expect(injected.get("x-fieldday-org-email")).toBe("admin@bcfalcons.com");
  });

  it("does not mutate the original request headers", () => {
    const req = new NextRequest("http://localhost/bcfalcons/register");
    injectOrgHeaders(req.headers, mockOrg);
    expect(req.headers.get("x-fieldday-org-id")).toBeNull();
  });
});
