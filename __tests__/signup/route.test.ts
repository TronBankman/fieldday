/**
 * Tests for POST /api/signup
 *
 * Happy path: mocked Supabase + mocked Stripe. Validates org row inserted
 * with bcrypted password, Stripe account created, JWT issued.
 * Error cases: missing fields, weak password, slug taken, Stripe failure.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------- Mocks ----------

// bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$10$hashed-password"),
    compare: vi.fn(),
  },
}));

// jsonwebtoken
vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("mock-jwt-token"),
    verify: vi.fn(),
  },
}));

// ID generator
vi.mock("@/lib/id", () => ({
  makeId: (prefix: string) => `${prefix}-mock-123`,
}));

// Supabase
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: (table: string) => {
      if (table === "organizations") {
        return {
          insert: mockInsert,
          update: (data: unknown) => {
            mockUpdate(data);
            return { eq: mockEq };
          },
        };
      }
      // teams, news_posts — just succeed
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    },
  }),
}));

// Stripe
const mockAccountsCreate = vi.fn();
const mockAccountLinksCreate = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    accounts: { create: mockAccountsCreate },
    accountLinks: { create: mockAccountLinksCreate },
  }),
}));

process.env.JWT_SECRET = "test-secret";

import { POST } from "../../app/api/signup/route";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Oakville Figure Skating Club",
  slug: "oakville-fsc",
  ownerEmail: "admin@oakvillefsc.com",
  password: "strongpassword123",
  terminology: "sports",
};

describe("POST /api/signup", () => {
  beforeEach(() => {
    mockInsert.mockReset().mockResolvedValue({ error: null });
    mockUpdate.mockReset();
    mockEq.mockReset().mockResolvedValue({ error: null });
    mockAccountsCreate.mockReset().mockResolvedValue({ id: "acct_stripe_123" });
    mockAccountLinksCreate.mockReset().mockResolvedValue({
      url: "https://connect.stripe.com/setup/e/test",
    });
  });

  it("creates org, Stripe account, seeds defaults, and returns JWT on happy path", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);

    const json = (await res.json()) as {
      ok: boolean;
      orgId: string;
      slug: string;
      stripeOnboardingUrl: string;
      token: string;
    };
    expect(json.ok).toBe(true);
    expect(json.orgId).toBe("ORG-mock-123");
    expect(json.slug).toBe("oakville-fsc");
    expect(json.stripeOnboardingUrl).toBe(
      "https://connect.stripe.com/setup/e/test",
    );
    expect(json.token).toBe("mock-jwt-token");

    // Verify org insert was called with bcrypted password (not plaintext)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ORG-mock-123",
        name: "Oakville Figure Skating Club",
        slug: "oakville-fsc",
        admin_password_hash: "$2b$10$hashed-password",
        onboarding_state: "stripe_pending",
        terminology: "sports",
        owner_email: "admin@oakvillefsc.com",
      }),
    );

    // Verify password is NOT in the insert payload as plaintext
    const insertCall = mockInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(JSON.stringify(insertCall)).not.toContain("strongpassword123");

    // Verify Stripe account created with correct metadata
    expect(mockAccountsCreate).toHaveBeenCalledWith({
      type: "express",
      email: "admin@oakvillefsc.com",
      metadata: { org_id: "ORG-mock-123", slug: "oakville-fsc" },
    });

    // Verify httpOnly cookie set
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("fieldday_admin=mock-jwt-token");
    expect(setCookie).toContain("HttpOnly");
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({ ...validBody, name: "" }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("Organization name");
  });

  it("returns 400 when slug is missing", async () => {
    const res = await POST(makeRequest({ ...validBody, slug: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid slug format", async () => {
    const res = await POST(makeRequest({ ...validBody, slug: "My Org!" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for reserved slug", async () => {
    const res = await POST(makeRequest({ ...validBody, slug: "admin" }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("reserved");
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ ...validBody, ownerEmail: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await POST(
      makeRequest({ ...validBody, ownerEmail: "not-an-email" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(
      makeRequest({ ...validBody, password: "short" }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("10 characters");
  });

  it("returns 400 for invalid terminology preset", async () => {
    const res = await POST(
      makeRequest({ ...validBody, terminology: "invalid" }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("terminology");
  });

  it("returns 400 when slug is taken at insert time", async () => {
    mockInsert.mockResolvedValue({
      error: { message: "duplicate key value violates unique constraint", code: "23505" },
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("already taken");
  });

  it("marks org as failed when Stripe accounts.create fails", async () => {
    mockAccountsCreate.mockRejectedValue(new Error("Stripe API error"));

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("payments");

    // Verify org marked as failed
    expect(mockUpdate).toHaveBeenCalledWith({ onboarding_state: "failed" });
  });

  it("uses correct preset color based on terminology", async () => {
    await POST(
      makeRequest({ ...validBody, terminology: "dance" }),
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        primary_color: "#d946ef",
        terminology: "dance",
      }),
    );
  });
});
