/**
 * Tests for GET /api/signup/slug-available
 *
 * Validates slug format, reserved list, and DB uniqueness check.
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

import { GET } from "../../app/api/signup/slug-available/route";

function makeRequest(slug: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/signup/slug-available?slug=${encodeURIComponent(slug)}`,
  );
}

describe("GET /api/signup/slug-available", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it("returns available: true for a valid unused slug", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await GET(makeRequest("my-new-org"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ available: true });
  });

  it("returns taken for an existing slug", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "org_123" },
      error: null,
    });
    const res = await GET(makeRequest("bcfalcons"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ available: false, reason: "taken" });
  });

  it("returns reserved for a reserved slug", async () => {
    const res = await GET(makeRequest("admin"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ available: false, reason: "reserved" });
  });

  it("returns reserved for 'signup'", async () => {
    const res = await GET(makeRequest("signup"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ available: false, reason: "reserved" });
  });

  it("returns invalid_format for uppercase slug", async () => {
    const res = await GET(makeRequest("MyOrg"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ available: false, reason: "invalid_format" });
  });

  it("returns invalid_format for slug with spaces", async () => {
    const res = await GET(makeRequest("my org"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ available: false, reason: "invalid_format" });
  });

  it("returns invalid_format for slug with special chars", async () => {
    const res = await GET(makeRequest("my_org!"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ available: false, reason: "invalid_format" });
  });

  it("returns invalid_format for slug shorter than 3 chars", async () => {
    const res = await GET(makeRequest("ab"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ available: false, reason: "invalid_format" });
  });

  it("returns invalid_format for empty slug", async () => {
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ available: false, reason: "invalid_format" });
  });

  it("returns error on DB failure", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "connection failed" },
    });
    const res = await GET(makeRequest("valid-slug"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ available: false, reason: "error" });
  });
});
