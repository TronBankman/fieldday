/**
 * Tests for GET /api/org/admin/payments
 *
 * Returns payment summary scoped to the admin's org.
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
const mockEq = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: () => ({
      select: () => ({
        eq: (col: string, val: string) => {
          mockEq(col, val);
          return Promise.resolve({
            data: [
              {
                id: "REG-001",
                full_name: "Alice",
                email: "alice@test.com",
                session_id: "SES-001",
                amount_due: 15000,
                amount_paid: 15000,
                paid_status: "Yes",
              },
              {
                id: "REG-002",
                full_name: "Bob",
                email: "bob@test.com",
                session_id: "SES-001",
                amount_due: 15000,
                amount_paid: 0,
                paid_status: "No",
              },
              {
                id: "REG-003",
                full_name: "Charlie",
                email: "charlie@test.com",
                session_id: "SES-002",
                amount_due: 10000,
                amount_paid: 5000,
                paid_status: "No",
              },
            ],
            error: null,
          });
        },
      }),
    }),
  }),
}));

process.env.JWT_SECRET = "test-secret";

import { GET } from "../app/api/org/admin/payments/route";

function makeRequest(withAuth = true): NextRequest {
  const headers: Record<string, string> = {};
  if (withAuth) headers.Authorization = "Bearer valid-admin-token";
  return new NextRequest("http://localhost/api/org/admin/payments", {
    method: "GET",
    headers,
  });
}

describe("GET /api/org/admin/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct payment summary", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      totalDue: number;
      totalPaid: number;
      totalOutstanding: number;
      unpaidCount: number;
      unpaid: Array<{ id: string }>;
    };
    expect(json.totalDue).toBe(40000); // 15000 + 15000 + 10000
    expect(json.totalPaid).toBe(20000); // 15000 + 0 + 5000
    expect(json.totalOutstanding).toBe(20000);
    expect(json.unpaidCount).toBe(2); // Bob + Charlie
    expect(json.unpaid).toHaveLength(2);
  });

  it("scopes query to admin org", async () => {
    await GET(makeRequest());
    expect(mockEq).toHaveBeenCalledWith("org_id", "org_bcfalcons");
  });

  it("returns 401 without auth token", async () => {
    const res = await GET(makeRequest(false));
    expect(res.status).toBe(401);
  });
});
