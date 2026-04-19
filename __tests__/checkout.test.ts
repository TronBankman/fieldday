/**
 * Tests for POST /api/org/checkout
 *
 * Critical path: creates a Stripe Checkout session for a registration.
 * Validates: input validation, server-side price validation, org scoping,
 * already-paid guard, connected account passthrough.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock resolve-org
vi.mock("@/lib/resolve-org", () => ({
  resolveOrgId: vi.fn().mockResolvedValue("org_test"),
}));

// Mock Stripe
const mockCheckoutCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: mockCheckoutCreate,
      },
    },
  }),
}));

// Mock Supabase — build flexible chaining
const mockOrgSingle = vi.fn();
const mockRegSingle = vi.fn();
const mockSessionSingle = vi.fn();
const mockPaymentInsert = vi.fn();
const mockPlanInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: (table: string) => {
      if (table === "organizations") {
        return {
          select: () => ({
            eq: () => ({
              single: mockOrgSingle,
            }),
          }),
        };
      }
      if (table === "registrations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: mockRegSingle,
              }),
            }),
          }),
        };
      }
      if (table === "sessions") {
        return {
          select: () => ({
            eq: () => ({
              single: mockSessionSingle,
            }),
          }),
        };
      }
      if (table === "payments") {
        return { insert: mockPaymentInsert };
      }
      if (table === "payment_plans") {
        return { insert: mockPlanInsert };
      }
      return {};
    },
  }),
}));

// Mock id generator
vi.mock("@/lib/id", () => ({
  makeId: (prefix: string) => `${prefix}-mock-123`,
}));

process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

import { POST } from "../app/api/org/checkout/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/org/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-fieldday-org-slug": "testorg",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/org/checkout", () => {
  beforeEach(() => {
    mockCheckoutCreate.mockReset();
    mockOrgSingle.mockReset();
    mockRegSingle.mockReset();
    mockSessionSingle.mockReset();
    mockPaymentInsert.mockReset();
    mockPlanInsert.mockReset();

    // Default happy-path mocks
    mockOrgSingle.mockResolvedValue({
      data: {
        id: "org_test",
        name: "Test Org",
        stripe_account_id: "acct_test123",
      },
    });
    mockRegSingle.mockResolvedValue({
      data: {
        id: "REG-1",
        org_id: "org_test",
        session_id: "SES-1",
        signup_type: "Spring League",
        amount_due: 15000,
        amount_paid: 0,
        paid_status: "No",
      },
    });
    mockSessionSingle.mockResolvedValue({
      data: { price: 15000, allow_installments: true, installment_count: 3 },
    });
    mockPaymentInsert.mockResolvedValue({ error: null });
    mockPlanInsert.mockResolvedValue({ error: null });
    mockCheckoutCreate.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    });
  });

  it("creates a Stripe Checkout session for full payment", async () => {
    const res = await POST(makeRequest({ registrationId: "REG-1" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { url: string };
    expect(json.url).toBe("https://checkout.stripe.com/pay/cs_test_123");

    // Verify Stripe was called with connected account passed as the second
    // options arg (Stripe Connect convention), not as a session param.
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        metadata: expect.objectContaining({
          registrationId: "REG-1",
          orgId: "org_test",
          planType: "full",
        }),
      }),
      { stripeAccount: "acct_test123" }
    );

    // Verify payment record was inserted
    expect(mockPaymentInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org_test",
        registration_id: "REG-1",
        amount: 15000,
        method: "stripe",
        status: "pending",
        stripe_session_id: "cs_test_123",
      })
    );
  });

  it("creates a deposit checkout session", async () => {
    const res = await POST(
      makeRequest({ registrationId: "REG-1", planType: "deposit" })
    );
    expect(res.status).toBe(200);

    // Deposit = ceil(15000 / 3) = 5000
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 5000,
            }),
          }),
        ],
      }),
      { stripeAccount: "acct_test123" }
    );

    // Verify payment plan was created
    expect(mockPlanInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org_test",
        registration_id: "REG-1",
        total_amount: 15000,
        deposit_amount: 5000,
      })
    );
  });

  it("rejects already-paid registrations", async () => {
    mockRegSingle.mockResolvedValue({
      data: {
        id: "REG-1",
        org_id: "org_test",
        paid_status: "Yes",
        amount_due: 15000,
        amount_paid: 15000,
      },
    });

    const res = await POST(makeRequest({ registrationId: "REG-1" }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("already paid");
  });

  it("rejects when no amount remaining", async () => {
    mockRegSingle.mockResolvedValue({
      data: {
        id: "REG-1",
        org_id: "org_test",
        paid_status: "No",
        amount_due: 15000,
        amount_paid: 15000,
        session_id: "SES-1",
      },
    });

    const res = await POST(makeRequest({ registrationId: "REG-1" }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("No amount remaining");
  });

  it("rejects missing registrationId", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("registrationId is required");
  });

  it("rejects invalid planType", async () => {
    const res = await POST(
      makeRequest({ registrationId: "REG-1", planType: "bogus" })
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("planType");
  });

  it("returns 404 for non-existent registration", async () => {
    mockRegSingle.mockResolvedValue({ data: null });

    const res = await POST(makeRequest({ registrationId: "REG-FAKE" }));
    expect(res.status).toBe(404);
  });

  it("uses session price as source of truth over registration amount_due", async () => {
    // Registration says 10000, but session price is 15000
    mockRegSingle.mockResolvedValue({
      data: {
        id: "REG-1",
        org_id: "org_test",
        session_id: "SES-1",
        signup_type: "Spring League",
        amount_due: 10000,
        amount_paid: 0,
        paid_status: "No",
      },
    });
    mockSessionSingle.mockResolvedValue({
      data: { price: 15000 },
    });

    const res = await POST(makeRequest({ registrationId: "REG-1" }));
    expect(res.status).toBe(200);

    // Should charge session price (15000), not registration amount_due (10000)
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 15000,
            }),
          }),
        ],
      }),
      { stripeAccount: "acct_test123" }
    );
  });

  it("works without connected account (direct charges)", async () => {
    mockOrgSingle.mockResolvedValue({
      data: {
        id: "org_test",
        name: "Test Org",
        stripe_account_id: "",
      },
    });

    const res = await POST(makeRequest({ registrationId: "REG-1" }));
    expect(res.status).toBe(200);

    // Should NOT include stripe_account
    const callArgs = mockCheckoutCreate.mock.calls[0][0];
    expect(callArgs.stripe_account).toBeUndefined();
  });
});
