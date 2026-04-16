/**
 * Tests for POST /api/org/admin/login
 *
 * Critical path: admin login with correct password returns JWT,
 * wrong password returns 401, missing password returns 400.
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
    sign: vi.fn().mockReturnValue("mock-jwt-token"),
    verify: vi.fn(),
  },
}));

// Mock Supabase — return org with password hash
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

// Set JWT_SECRET for auth module
process.env.JWT_SECRET = "test-secret";

import { POST } from "../app/api/org/admin/login/route";

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
  return new NextRequest("http://localhost/api/org/admin/login", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/org/admin/login", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    mockCompare.mockReset();
  });

  it("returns a token for correct password", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "org_bcfalcons", admin_password_hash: "$2b$10$hashed" },
      error: null,
    });
    mockCompare.mockResolvedValue(true as never);

    const res = await POST(makeRequest({ password: "correct-password" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect((json as { token: string }).token).toBe("mock-jwt-token");
  });

  it("returns 401 for wrong password", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "org_bcfalcons", admin_password_hash: "$2b$10$hashed" },
      error: null,
    });
    mockCompare.mockResolvedValue(false as never);

    const res = await POST(makeRequest({ password: "wrong-password" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect((json as { error: string }).error).toBe("Invalid password");
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect((json as { error: string }).error).toBe("Password is required");
  });

  it("returns 404 when org header is missing", async () => {
    const res = await POST(makeRequest({ password: "test" }, null));
    expect(res.status).toBe(404);
  });

  it("returns 403 when org has no admin password configured", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "org_bcfalcons", admin_password_hash: null },
      error: null,
    });

    const res = await POST(makeRequest({ password: "test" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect((json as { error: string }).error).toContain("not configured");
  });
});
