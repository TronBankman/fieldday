/**
 * Tests for POST /api/org/player/signup
 *
 * Critical path: signup creates player and returns JWT,
 * duplicate email returns 409, validation errors return 400.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("$2b$10$hashed-password"),
  },
}));

// Mock jsonwebtoken
vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("mock-signup-jwt"),
    verify: vi.fn(),
  },
}));

// Mock Supabase
const mockExistingSingle = vi.fn();
const mockInsert = vi.fn();
const mockLinkIlike = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: (table: string) => {
      if (table === "players") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: mockExistingSingle,
              }),
            }),
          }),
          insert: mockInsert,
        };
      }
      // registrations link chain
      return {
        update: () => ({
          eq: () => ({
            eq: () => ({
              ilike: mockLinkIlike,
            }),
          }),
        }),
      };
    },
  }),
}));

// Set JWT_SECRET for auth module
process.env.JWT_SECRET = "test-secret";

import { POST } from "../app/api/org/player/signup/route";

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
  return new NextRequest("http://localhost/api/org/player/signup", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/org/player/signup", () => {
  beforeEach(() => {
    mockExistingSingle.mockReset();
    mockInsert.mockReset();
    mockLinkIlike.mockReset().mockResolvedValue({ data: null, error: null });
  });

  it("creates a player and returns a token", async () => {
    mockExistingSingle.mockResolvedValue({ data: null, error: null });
    mockInsert.mockResolvedValue({ error: null });

    const res = await POST(
      makeRequest({
        fullName: "New Player",
        email: "new@test.com",
        password: "password123",
      })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect((json as { token: string }).token).toBe("mock-signup-jwt");
    expect(
      (json as { player: { fullName: string } }).player.fullName
    ).toBe("New Player");
  });

  it("returns 409 when email already exists", async () => {
    mockExistingSingle.mockResolvedValue({
      data: { id: "PLR-existing" },
      error: null,
    });

    const res = await POST(
      makeRequest({
        fullName: "Dupe Player",
        email: "existing@test.com",
        password: "password123",
      })
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect((json as { error: string }).error).toContain("already exists");
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(
      makeRequest({ email: "test@test.com", password: "password123" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect((json as { error: string }).error).toContain("name");
  });

  it("returns 400 when email is invalid", async () => {
    const res = await POST(
      makeRequest({
        fullName: "Test",
        email: "not-an-email",
        password: "password123",
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect((json as { error: string }).error).toContain("email");
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(
      makeRequest({
        fullName: "Test",
        email: "test@test.com",
        password: "short",
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect((json as { error: string }).error).toContain("8 characters");
  });

  it("returns 404 when org header is missing", async () => {
    const res = await POST(
      makeRequest(
        {
          fullName: "Test",
          email: "test@test.com",
          password: "password123",
        },
        null
      )
    );
    expect(res.status).toBe(404);
  });
});
