/**
 * Tests for POST/GET /api/org/admin/sessions
 *
 * Critical path: sessions are created scoped to the org from the JWT,
 * and GET returns only sessions for that org.
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
const mockInsert = vi.fn();
const mockSelectSingle = vi.fn();
const mockSelectAll = vi.fn();
const mockOrder = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: (table: string) => {
      if (table === "sessions") {
        return {
          insert: (row: Record<string, unknown>) => {
            mockInsert(row);
            return {
              select: () => ({
                single: () => {
                  mockSelectSingle();
                  return Promise.resolve({
                    data: { id: row.id || "SES-001", ...row },
                    error: null,
                  });
                },
              }),
            };
          },
          select: () => {
            mockSelectAll();
            return {
              eq: (_col: string, _val: unknown) => ({
                eq: (_col2: string, _val2: unknown) => ({
                  order: (_c: string, _o: unknown) => {
                    mockOrder();
                    return Promise.resolve({
                      data: [
                        {
                          id: "SES-001",
                          name: "Spring Session",
                          date: "2026-05-01",
                          time: "18:00",
                          location: "Rink A",
                          org_id: "org_bcfalcons",
                          price: 15000,
                          active: true,
                        },
                      ],
                      error: null,
                    });
                  },
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

import { GET, POST } from "../app/api/org/admin/sessions/route";

function makeAuthHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer valid-admin-token",
  };
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/org/admin/sessions", {
    method: "POST",
    headers: makeAuthHeaders(),
    body: JSON.stringify(body),
  });
}

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/org/admin/sessions", {
    method: "GET",
    headers: { Authorization: "Bearer valid-admin-token" },
  });
}

describe("POST /api/org/admin/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a session scoped to the admin org", async () => {
    const res = await POST(
      makePostRequest({
        name: "Spring Session",
        date: "2026-05-01",
        time: "18:00",
        location: "Rink A",
        price: 150,
      })
    );
    expect(res.status).toBe(201);
    // Verify the insert was called with org_id from JWT
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ org_id: "org_bcfalcons" })
    );
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makePostRequest({ name: "Incomplete" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect((json as { error: string }).error).toContain("required");
  });

  it("returns 401 without auth token", async () => {
    const req = new NextRequest("http://localhost/api/org/admin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("converts price from dollars to cents", async () => {
    await POST(
      makePostRequest({
        name: "Test",
        date: "2026-06-01",
        time: "19:00",
        location: "Arena B",
        price: 149.99,
      })
    );
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ price: 14999 })
    );
  });
});

describe("GET /api/org/admin/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sessions for the admin org", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    const sessions = (json as { sessions: Array<{ id: string; name: string }> }).sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].name).toBe("Spring Session");
  });
});
