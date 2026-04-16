/**
 * Tests for POST /api/org/player/login
 *
 * Critical path: player login with correct email+password returns JWT,
 * wrong password returns 401, missing fields return 400.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import bcrypt from "bcryptjs";
const mockCompare = vi.mocked(bcrypt.compare);

// Mock jsonwebtoken
vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("mock-player-jwt"),
    verify: vi.fn(),
  },
}));

// Mock Supabase
const mockSingle = vi.fn();
const mockIlike = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: (table: string) => {
      if (table === "players") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: mockSingle,
              }),
            }),
          }),
        };
      }
      // registrations update chain
      return {
        update: () => ({
          eq: () => ({
            eq: () => ({
              ilike: mockIlike,
            }),
          }),
        }),
      };
    },
  }),
}));

// Set JWT_SECRET for auth module
process.env.JWT_SECRET = "test-secret";

import { POST } from "../app/api/org/player/login/route";

function makeRequest(
  body: unknown,
  orgId: string | null = "org_bcfalcons"
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (orgId !== null) {
    headers["x-fieldday-org-id"] = orgId;
  }
  return new NextRequest("http://localhost/api/org/player/login", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/org/player/login", () => {
  beforeEach(() => {
    mockSingle.mockReset();
    mockCompare.mockReset();
    mockIlike.mockReset().mockResolvedValue({ data: null, error: null });
  });

  it("returns a token for correct credentials", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "PLR-123",
        email: "player@test.com",
        password_hash: "$2b$10$hashed",
        full_name: "Test Player",
      },
      error: null,
    });
    mockCompare.mockResolvedValue(true as never);

    const res = await POST(
      makeRequest({ email: "player@test.com", password: "correct-pass" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect((json as { token: string }).token).toBe("mock-player-jwt");
    expect(
      (json as { player: { fullName: string } }).player.fullName
    ).toBe("Test Player");
  });

  it("returns 401 for wrong password", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "PLR-123",
        email: "player@test.com",
        password_hash: "$2b$10$hashed",
        full_name: "Test Player",
      },
      error: null,
    });
    mockCompare.mockResolvedValue(false as never);

    const res = await POST(
      makeRequest({ email: "player@test.com", password: "wrong-pass" })
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect((json as { error: string }).error).toBe(
      "Invalid email or password."
    );
  });

  it("returns 401 when player not found", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(
      makeRequest({ email: "nobody@test.com", password: "test" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ password: "test" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect((json as { error: string }).error).toContain("email");
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ email: "player@test.com" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect((json as { error: string }).error).toContain("Password");
  });

  it("returns 404 when org header is missing", async () => {
    const res = await POST(
      makeRequest({ email: "player@test.com", password: "test" }, null)
    );
    expect(res.status).toBe(404);
  });
});
