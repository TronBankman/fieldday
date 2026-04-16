/**
 * Tests for GET/PATCH /api/org/admin/registrations
 *
 * Critical path: registrations are scoped to the org from the JWT,
 * and PATCH updates approval/paid status correctly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock jsonwebtoken — simulate valid admin token
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn().mockReturnValue({ sub: "org_bcfalcons", role: "admin" }),
    sign: vi.fn(),
  },
}));

// Mock Supabase
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockUpdate = vi.fn();
const mockEqChain = vi.fn();
const mockSelectSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: (table: string) => {
      if (table === "registrations") {
        return {
          select: (...args: unknown[]) => {
            mockSelect(...args);
            return {
              eq: (col: string, val: string) => {
                mockEqChain(col, val);
                return {
                  order: (_col: string, _opts: unknown) => {
                    mockOrder(_col, _opts);
                    return Promise.resolve({
                      data: [
                        {
                          id: "REG-001",
                          full_name: "Jane Smith",
                          email: "jane@test.com",
                          org_id: val,
                          approval_status: "pending",
                          paid_status: "No",
                          amount_due: 5000,
                          amount_paid: 0,
                          timestamp: "2026-04-01",
                        },
                      ],
                      error: null,
                    });
                  },
                };
              },
            };
          },
          update: (updates: Record<string, unknown>) => {
            mockUpdate(updates);
            return {
              eq: (_col: string, _val: string) => ({
                eq: (_col2: string, _val2: string) => ({
                  select: () => ({
                    single: () => {
                      mockSelectSingle();
                      return Promise.resolve({
                        data: { id: "REG-001", ...updates },
                        error: null,
                      });
                    },
                  }),
                }),
              }),
            };
          },
        };
      }
      return {};
    },
  }),
}));

process.env.JWT_SECRET = "test-secret";

import { GET, PATCH } from "../app/api/org/admin/registrations/route";

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/org/admin/registrations", {
    method: "GET",
    headers: {
      Authorization: "Bearer valid-admin-token",
    },
  });
}

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/org/admin/registrations", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-admin-token",
    },
    body: JSON.stringify(body),
  });
}

function makeUnauthRequest(): NextRequest {
  return new NextRequest("http://localhost/api/org/admin/registrations", {
    method: "GET",
  });
}

describe("GET /api/org/admin/registrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns registrations scoped to the admin org", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    const regs = (json as { registrations: Array<{ id: string; fullName: string }> }).registrations;
    expect(regs).toHaveLength(1);
    expect(regs[0].fullName).toBe("Jane Smith");
    // Verify the query was scoped to the org from JWT
    expect(mockEqChain).toHaveBeenCalledWith("org_id", "org_bcfalcons");
  });

  it("returns 401 without auth token", async () => {
    const res = await GET(makeUnauthRequest());
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/org/admin/registrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates approval_status", async () => {
    const res = await PATCH(
      makePatchRequest({ id: "REG-001", approvalStatus: "approved" })
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ approval_status: "approved" });
  });

  it("updates paid_status", async () => {
    const res = await PATCH(
      makePatchRequest({ id: "REG-001", paidStatus: "Yes" })
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ paid_status: "Yes" });
  });

  it("returns 400 when id is missing", async () => {
    const res = await PATCH(makePatchRequest({ approvalStatus: "approved" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when no fields to update", async () => {
    const res = await PATCH(makePatchRequest({ id: "REG-001" }));
    expect(res.status).toBe(400);
  });
});
