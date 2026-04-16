/**
 * Tests for PUT /api/org/player/availability
 *
 * Critical path: updates RSVP status on a registration owned by the player.
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
const mockRegSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: mockRegSingle,
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: mockUpdate,
        }),
      }),
    }),
  }),
}));

process.env.JWT_SECRET = "test-secret";

import { PUT } from "../app/api/org/player/availability/route";

function makeRequest(
  body: unknown,
  token: string | null = "valid-token"
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/org/player/availability", {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
}

describe("PUT /api/org/player/availability", () => {
  beforeEach(() => {
    mockRegSingle.mockReset();
    mockUpdate.mockReset();
  });

  it("updates availability for a valid registration", async () => {
    mockRegSingle.mockResolvedValue({
      data: { id: "REG-1", player_id: "PLR-123" },
      error: null,
    });
    mockUpdate.mockResolvedValue({ error: null });

    const res = await PUT(
      makeRequest({ registrationId: "REG-1", availability: "attending" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect((json as { ok: boolean }).ok).toBe(true);
    expect((json as { availability: string }).availability).toBe("attending");
  });

  it("returns 404 when registration belongs to another player", async () => {
    mockRegSingle.mockResolvedValue({
      data: { id: "REG-1", player_id: "PLR-OTHER" },
      error: null,
    });

    const res = await PUT(
      makeRequest({ registrationId: "REG-1", availability: "attending" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid availability value", async () => {
    const res = await PUT(
      makeRequest({ registrationId: "REG-1", availability: "maybe" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when registrationId is missing", async () => {
    const res = await PUT(makeRequest({ availability: "attending" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when no token is provided", async () => {
    const res = await PUT(
      makeRequest(
        { registrationId: "REG-1", availability: "attending" },
        null
      )
    );
    expect(res.status).toBe(401);
  });
});
