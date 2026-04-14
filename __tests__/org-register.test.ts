/**
 * Tests for POST /api/org/register
 *
 * Critical path: verify the route correctly scopes registrations to
 * the org injected by middleware, validates inputs, and calls Supabase
 * with the correct org_id.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase — track insert calls
const mockInsert = vi.fn().mockReturnValue({ error: null });
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

import { POST } from "../app/api/org/register/route";

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

  return new NextRequest("http://localhost/api/org/register", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/org/register", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockInsert.mockReturnValue({ error: null });
  });

  it("accepts a valid registration and inserts with correct org_id", async () => {
    const req = makeRequest({
      full_name: "Jane Smith",
      email: "jane@bcfalcons.com",
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.registrationId).toBeDefined();
    expect(json.registrationId).toMatch(/^REG-/);

    // Verify Supabase was called with the middleware org_id
    expect(mockInsert).toHaveBeenCalledOnce();
    const insertedRow = mockInsert.mock.calls[0][0];
    expect(insertedRow.org_id).toBe("org_bcfalcons");
    expect(insertedRow.full_name).toBe("Jane Smith");
    expect(insertedRow.email).toBe("jane@bcfalcons.com");
    expect(insertedRow.paid_status).toBe("No");
    expect(insertedRow.approval_status).toBe("pending");
  });

  it("accepts registration with all optional fields", async () => {
    const req = makeRequest({
      full_name: "Alex Chen",
      email: "alex@example.com",
      phone: "604-555-1234",
      guardian_name: "Pat Chen",
      birth_year: "2012",
      signup_type: "Session Signup",
      session_id: "SES-123",
      participant_role: "Forward",
      jersey_1: "9",
      jersey_2: "19",
      jersey_3: "91",
      tshirt_size: "M",
      sweatshirt_size: "L",
      comments: "Looking forward to it",
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const insertedRow = mockInsert.mock.calls[0][0];
    expect(insertedRow.guardian_name).toBe("Pat Chen");
    expect(insertedRow.birth_year).toBe("2012");
    expect(insertedRow.session_id).toBe("SES-123");
    expect(insertedRow.participant_role).toBe("Forward");
    expect(insertedRow.tshirt_size).toBe("M");
    expect(insertedRow.comments).toBe("Looking forward to it");
  });

  it("rejects when x-fieldday-org-id header is missing (no middleware)", async () => {
    const req = makeRequest({ full_name: "Jane Smith", email: "jane@bcfalcons.com" }, null);
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty("error");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects cross-org data injection: body org_id differs from header org_id", async () => {
    const req = makeRequest(
      {
        full_name: "Attacker",
        email: "evil@other-org.com",
        org_id: "org_other",
      },
      "org_bcfalcons"
    );
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect((json as { error: string }).error).toMatch(/org_id mismatch/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("allows body org_id when it matches the middleware org_id", async () => {
    const req = makeRequest(
      {
        full_name: "Jane Smith",
        email: "jane@bcfalcons.com",
        org_id: "org_bcfalcons",
      },
      "org_bcfalcons"
    );
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("rejects when full_name is empty", async () => {
    const req = makeRequest({ full_name: "", email: "jane@bcfalcons.com" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty("error");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects when full_name is missing", async () => {
    const req = makeRequest({ email: "jane@bcfalcons.com" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects when email is invalid", async () => {
    const req = makeRequest({ full_name: "Jane Smith", email: "not-an-email" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect((json as { error: string }).error).toMatch(/email/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects when email is missing", async () => {
    const req = makeRequest({ full_name: "Jane Smith" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-fieldday-org-id": "org_bcfalcons",
    };
    const req = new NextRequest("http://localhost/api/org/register", {
      method: "POST",
      headers,
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 500 when Supabase insert fails", async () => {
    mockInsert.mockReturnValue({ error: { message: "DB error" } });
    const req = makeRequest({
      full_name: "Jane Smith",
      email: "jane@bcfalcons.com",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });
});
