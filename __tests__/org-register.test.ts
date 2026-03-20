/**
 * Tests for POST /api/org/register
 *
 * Critical path: verify the route correctly scopes registrations to
 * the org injected by middleware, and rejects cross-org data injection.
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
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
  it("accepts a valid registration scoped to the middleware org", async () => {
    const req = makeRequest({
      full_name: "Jane Smith",
      email: "jane@bcfalcons.com",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it("accepts registration without phone (phone is optional)", async () => {
    const req = makeRequest({
      full_name: "Alex Chen",
      email: "alex@example.com",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("rejects when x-fieldday-org-id header is missing (no middleware)", async () => {
    const req = makeRequest({ full_name: "Jane Smith", email: "jane@bcfalcons.com" }, null);
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it("rejects cross-org data injection: body org_id differs from header org_id", async () => {
    const req = makeRequest(
      {
        full_name: "Attacker",
        email: "evil@other-org.com",
        org_id: "org_other",   // attempts to register data for a different org
      },
      "org_bcfalcons"          // middleware says this request is for bcfalcons
    );
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect((json as { error: string }).error).toMatch(/org_id mismatch/i);
  });

  it("allows body org_id when it matches the middleware org_id", async () => {
    const req = makeRequest(
      {
        full_name: "Jane Smith",
        email: "jane@bcfalcons.com",
        org_id: "org_bcfalcons", // explicitly supplied but matches header
      },
      "org_bcfalcons"
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("rejects when full_name is empty", async () => {
    const req = makeRequest({ full_name: "", email: "jane@bcfalcons.com" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it("rejects when email is invalid", async () => {
    const req = makeRequest({ full_name: "Jane Smith", email: "not-an-email" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect((json as { error: string }).error).toMatch(/email/i);
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
  });
});
