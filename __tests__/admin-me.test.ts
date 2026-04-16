/**
 * Tests for GET /api/org/admin/me
 *
 * Verifies admin token and returns org info.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock jsonwebtoken
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn().mockReturnValue({ sub: "org_bcfalcons", role: "admin" }),
    sign: vi.fn(),
  },
}));

// Mock Supabase
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

process.env.JWT_SECRET = "test-secret";

import { GET } from "../app/api/org/admin/me/route";

function makeRequest(withAuth = true): NextRequest {
  const headers: Record<string, string> = {};
  if (withAuth) headers.Authorization = "Bearer valid-admin-token";
  return new NextRequest("http://localhost/api/org/admin/me", {
    method: "GET",
    headers,
  });
}

describe("GET /api/org/admin/me", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it("returns org info for a valid admin token", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "org_bcfalcons",
        name: "BC Falcons Hockey",
        slug: "bcfalcons",
        sport: "hockey",
        primary_color: "#cc0000",
        logo_url: "",
        contact_email: "admin@bcfalcons.com",
      },
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    const org = (json as { org: { name: string; slug: string } }).org;
    expect(org.name).toBe("BC Falcons Hockey");
    expect(org.slug).toBe("bcfalcons");
  });

  it("returns 401 without auth token", async () => {
    const res = await GET(makeRequest(false));
    expect(res.status).toBe(401);
  });

  it("returns 404 when org not found", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(404);
  });
});
