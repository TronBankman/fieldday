/**
 * Tests for GET/PATCH /api/org/admin/onboarding
 *
 * GET returns onboarding state + stripe URL + terminology.
 * PATCH allows setting state to 'active' (dismiss banner).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock jsonwebtoken
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn().mockReturnValue({ sub: "org_123", role: "admin" }),
    sign: vi.fn(),
  },
}));

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

process.env.JWT_SECRET = "test-secret";

import { GET, PATCH } from "../../app/api/org/admin/onboarding/route";

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/org/admin/onboarding", {
    method: "GET",
    headers: { Authorization: "Bearer valid-token" },
  });
}

function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/org/admin/onboarding", {
    method: "PATCH",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("GET /api/org/admin/onboarding", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it("returns onboarding state for authenticated admin", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        onboarding_state: "stripe_pending",
        stripe_onboarding_url: "https://connect.stripe.com/test",
        terminology: "fitness",
      },
      error: null,
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      onboardingState: string;
      stripeOnboardingUrl: string;
      terminology: string;
    };
    expect(json.onboardingState).toBe("stripe_pending");
    expect(json.stripeOnboardingUrl).toBe("https://connect.stripe.com/test");
    expect(json.terminology).toBe("fitness");
  });

  it("returns 401 without auth", async () => {
    const req = new NextRequest("http://localhost/api/org/admin/onboarding", {
      method: "GET",
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 404 when org not found", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/org/admin/onboarding", () => {
  beforeEach(() => {
    mockUpdate.mockClear();
    mockUpdateEq.mockClear().mockResolvedValue({ error: null });
  });

  it("sets onboarding state to active (dismiss)", async () => {
    const res = await PATCH(makePatchRequest({ onboardingState: "active" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { onboardingState: string };
    expect(json.onboardingState).toBe("active");

    expect(mockUpdate).toHaveBeenCalledWith({ onboarding_state: "active" });
  });

  it("rejects non-active state values", async () => {
    const res = await PATCH(
      makePatchRequest({ onboardingState: "stripe_pending" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const req = new NextRequest("http://localhost/api/org/admin/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingState: "active" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });
});
