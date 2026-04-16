/**
 * Tests for resolveOrgId helper.
 *
 * Verifies that org ID is resolved from either:
 * 1. x-fieldday-org-id header (proxy-injected)
 * 2. x-fieldday-org-slug header (client-side) with DB lookup
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockMaybeSingle = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  }),
}));

import { resolveOrgId } from "../lib/resolve-org";

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("resolveOrgId", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it("returns org ID from x-fieldday-org-id header", async () => {
    const req = makeRequest({ "x-fieldday-org-id": "org_abc123" });
    const result = await resolveOrgId(req);
    expect(result).toBe("org_abc123");
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it("falls back to slug lookup when org-id header is missing", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "org_from_slug" },
      error: null,
    });

    const req = makeRequest({ "x-fieldday-org-slug": "bcfalcons" });
    const result = await resolveOrgId(req);
    expect(result).toBe("org_from_slug");
  });

  it("returns null when slug lookup finds no org", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const req = makeRequest({ "x-fieldday-org-slug": "nonexistent" });
    const result = await resolveOrgId(req);
    expect(result).toBeNull();
  });

  it("returns null when neither header is present", async () => {
    const req = makeRequest({});
    const result = await resolveOrgId(req);
    expect(result).toBeNull();
  });

  it("prefers org-id header over slug header", async () => {
    const req = makeRequest({
      "x-fieldday-org-id": "org_direct",
      "x-fieldday-org-slug": "some-slug",
    });
    const result = await resolveOrgId(req);
    expect(result).toBe("org_direct");
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });
});
