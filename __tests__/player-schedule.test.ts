/**
 * Tests for GET /api/org/player/schedule
 *
 * Critical path: returns only this player's registrations with session details.
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

import { GET } from "../app/api/org/player/schedule/route";

function makeRequest(token: string | null = "valid-token"): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/org/player/schedule", {
    method: "GET",
    headers,
  });
}

describe("GET /api/org/player/schedule", () => {
  beforeEach(() => {
    mockRegsOrder.mockReset();
    mockSessionsIn.mockReset();
  });

  it("returns player registrations with session details", async () => {
    mockRegsOrder.mockResolvedValue({
      data: [
        {
          id: "REG-1",
          timestamp: "2026-01-01",
          signup_type: "player",
          session_id: "SES-1",
          participant_role: "forward",
          approval_status: "approved",
          availability: "attending",
        },
      ],
      error: null,
    });
    mockSessionsIn.mockResolvedValue({
      data: [
        {
          id: "SES-1",
          name: "Spring Session",
          date: "2026-04-01",
          time: "18:00",
          location: "Ice Arena",
          program: "Spring League",
          duration_minutes: 90,
          open_to_public: true,
        },
      ],
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    const regs = (json as { registrations: Array<Record<string, unknown>> })
      .registrations;
    expect(regs).toHaveLength(1);
    expect(regs[0].sessionName).toBe("Spring Session");
    expect(regs[0].availability).toBe("attending");
  });

  it("returns empty array when player has no registrations", async () => {
    mockRegsOrder.mockResolvedValue({ data: [], error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(
      (json as { registrations: unknown[] }).registrations
    ).toHaveLength(0);
  });

  it("returns 401 when no token is provided", async () => {
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(401);
  });
});
