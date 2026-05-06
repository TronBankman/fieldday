/**
 * Tests for POST /api/signup/stripe-refresh
 *
 * Authorized refresh: valid admin cookie → fresh Stripe link returned.
 * Unauthorized: no cookie or wrong org → 403.
 * Slug not found → 404.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock jsonwebtoken
vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("mock-jwt-token"),
    verify: vi.fn(),
  },
}));
import jwt from "jsonwebtoken";
const mockVerify = vi.mocked(jwt.verify);

// Mock Supabase
const mockMaybeSingle = vi.fn();
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
      update: mockUpdate,
    }),
  }),
}));

// Mock Stripe
const mockAccountLinksCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    accountLinks: { create: mockAccountLinksCreate },
  }),
}));

process.env.JWT_SECRET = "test-secret";

import { POST } from "../../app/api/signup/stripe-refresh/route";

function makeRequest(
  body: Record<string, unknown>,
  cookie?: string,
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) {
    headers["Cookie"] = `fieldday_admin=${cookie}`;
  }
  return new NextRequest("http://localhost:3000/api/signup/stripe-refresh", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/signup/stripe-refresh", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    mockUpdate.mockClear();
    mockUpdateEq.mockClear().mockResolvedValue({ error: null });
    mockAccountLinksCreate.mockReset();
    mockVerify.mockReset();
  });

  it("returns fresh Stripe URL for authorized request", async () => {
    mockVerify.mockReturnValue({ sub: "org_123", role: "admin" } as never);
    mockMaybeSingle.mockResolvedValue({
      data: { id: "org_123", stripe_account_id: "acct_stripe_abc", slug: "my-org" },
      error: null,
    });
    mockAccountLinksCreate.mockResolvedValue({
      url: "https://connect.stripe.com/setup/fresh",
    });

    const res = await POST(makeRequest({ slug: "my-org" }, "valid-token"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { url: string };
    expect(json.url).toBe("https://connect.stripe.com/setup/fresh");

    // Verify Stripe accountLinks.create was called
    expect(mockAccountLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        account: "acct_stripe_abc",
        type: "account_onboarding",
      }),
    );

    // Verify DB update with fresh URL
    expect(mockUpdate).toHaveBeenCalledWith({
      stripe_onboarding_url: "https://connect.stripe.com/setup/fresh",
    });
  });

  it("returns 403 when no admin cookie provided", async () => {
    const res = await POST(makeRequest({ slug: "my-org" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when cookie is for a different org", async () => {
    mockVerify.mockReturnValue({ sub: "org_other", role: "admin" } as never);
    mockMaybeSingle.mockResolvedValue({
      data: { id: "org_123", stripe_account_id: "acct_stripe_abc", slug: "my-org" },
      error: null,
    });

    const res = await POST(makeRequest({ slug: "my-org" }, "wrong-org-token"));
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Forbidden");
  });

  it("returns 404 when slug does not exist", async () => {
    mockVerify.mockReturnValue({ sub: "org_123", role: "admin" } as never);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ slug: "nonexistent" }, "valid-token"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when token is invalid", async () => {
    mockVerify.mockImplementation(() => {
      throw new Error("invalid token");
    });

    const res = await POST(makeRequest({ slug: "my-org" }, "bad-token"));
    expect(res.status).toBe(403);
  });
});
