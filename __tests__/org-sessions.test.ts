/**
 * Tests for GET /api/org/sessions
 *
 * Verifies that the sessions endpoint returns only sessions
 * for the org identified by the x-fieldday-org-id header.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockOrder = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return {
              gte: (...gteArgs: unknown[]) => {
                mockGte(...gteArgs);
                return {
                  order: (...orderArgs: unknown[]) => {
                    mockOrder(...orderArgs);
                    return {
                      data: [
                        {
                          id: "SES-1",
                          name: "Spring Session",
                          date: "2026-05-01",
                          time: "18:00",
                          location: "Arena A",
                          price: 150,
                          allow_installments: true,
                          installment_count: 3,
                        },
                      ],
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      },
    }),
  }),
}));

import { GET } from "../app/api/org/sessions/route";

function makeRequest(orgId: string | null = "org_bcfalcons"): NextRequest {
  const headers: Record<string, string> = {};
  if (orgId !== null) {
    headers["x-fieldday-org-id"] = orgId;
  }
  return new NextRequest("http://localhost/api/org/sessions", {
    method: "GET",
    headers,
  });
}

describe("GET /api/org/sessions", () => {
  beforeEach(() => {
    mockSelect.mockClear();
    mockEq.mockClear();
    mockGte.mockClear();
    mockOrder.mockClear();
  });

  it("returns sessions for the org", async () => {
    const req = makeRequest("org_bcfalcons");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sessions).toHaveLength(1);
    expect(json.sessions[0].name).toBe("Spring Session");
    expect(json.sessions[0].price).toBe(150);
  });

  it("filters by org_id from the header", async () => {
    const req = makeRequest("org_bcfalcons");
    await GET(req);
    expect(mockEq).toHaveBeenCalledWith("org_id", "org_bcfalcons");
  });

  it("filters by date >= today", async () => {
    const req = makeRequest("org_bcfalcons");
    await GET(req);
    expect(mockGte).toHaveBeenCalledWith("date", expect.any(String));
    // Verify it's a YYYY-MM-DD string
    const dateArg = mockGte.mock.calls[0][1] as string;
    expect(dateArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("orders by date ascending", async () => {
    const req = makeRequest("org_bcfalcons");
    await GET(req);
    expect(mockOrder).toHaveBeenCalledWith("date", { ascending: true });
  });

  it("returns 404 when x-fieldday-org-id header is missing", async () => {
    const req = makeRequest(null);
    const res = await GET(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });
});
