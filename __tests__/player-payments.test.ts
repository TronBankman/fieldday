/**
 * Tests for GET /api/org/player/payments
 *
 * Critical path: returns payment info for this player's registrations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock jsonwebtoken
vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn().mockReturnValue({
      sub: "PLR-123",
      org: "org_bcfalcons",
      email: "player@test.com",
      role: "player",
    }),
  },
}));

// Mock Supabase
const mockRegsOrder = vi.fn();
const mockSessionsIn = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: (table: string) => {
      if (table === "registrations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: mockRegsOrder,
              }),
            }),
          }),
        };
      }
      // sessions
      return {
        select: () => ({
          in: mockSessionsIn,
        }),
      };
    },
  }),
}));

process.env.JWT_SECRET = "test-secret";

import { GET } from "../app/api/org/player/payments/route";

function makeRequest(token: string | null = "valid-token"): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/org/player/payments", {
    method: "GET",
    headers,
  });
}

describe("GET /api/org/player/payments", () => {
  beforeEach(() => {
    mockRegsOrder.mockReset();
    mockSessionsIn.mockReset();
  });

  it("returns payment entries with summary", async () => {
    mockRegsOrder.mockResolvedValue({
      data: [
        {
          id: "REG-1",
          session_id: "SES-1",
          amount_due: 15000,
          amount_paid: 5000,
          paid_status: "No",
          timestamp: "2026-01-01",
        },
        {
          id: "REG-2",
          session_id: "SES-2",
          amount_due: 10000,
          amount_paid: 10000,
          paid_status: "Yes",
          timestamp: "2026-02-01",
        },
      ],
      error: null,
    });
    mockSessionsIn.mockResolvedValue({
      data: [
        {
          id: "SES-1",
          name: "Spring League",
          date: "2026-04-01",
          price: 15000,
          allow_installments: true,
          installment_count: 3,
        },
        {
          id: "SES-2",
          name: "Summer Camp",
          date: "2026-07-01",
          price: 10000,
          allow_installments: false,
          installment_count: 3,
        },
      ],
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      payments: Array<Record<string, unknown>>;
      summary: { totalDue: number; totalPaid: number; outstanding: number };
    };
    expect(json.payments).toHaveLength(2);
    expect(json.summary.totalDue).toBe(25000);
    expect(json.summary.totalPaid).toBe(15000);
    expect(json.summary.outstanding).toBe(10000);
  });

  it("returns empty when player has no payments", async () => {
    mockRegsOrder.mockResolvedValue({
      data: [
        {
          id: "REG-1",
          session_id: "SES-1",
          amount_due: 0,
          amount_paid: 0,
          paid_status: "No",
          timestamp: "2026-01-01",
        },
      ],
      error: null,
    });
    mockSessionsIn.mockResolvedValue({ data: [] });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      payments: unknown[];
      summary: { totalDue: number };
    };
    expect(json.payments).toHaveLength(0);
    expect(json.summary.totalDue).toBe(0);
  });

  it("returns 401 when no token is provided", async () => {
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(401);
  });
});
