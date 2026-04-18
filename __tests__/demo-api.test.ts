/**
 * Tests for /api/demo — the cold-outreach landing-page endpoint.
 *
 * We stub the Resend admin-alert path via fetch so we can assert it
 * fires on success. Supabase is NOT configured in test env, so the
 * route falls through to the console-log branch — that's intentional
 * and documented behavior (we never 500 the user for infra gaps).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Email env must be set before importing the route (which imports lib/email).
process.env.RESEND_API_KEY = "re_test_key";
process.env.RESEND_FROM_EMAIL = "Test <noreply@test.fieldday.app>";
process.env.FIELDDAY_NOTIFY_EMAIL = "team@fieldday.app";

import { POST } from "../app/api/demo/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  businessName: "Eastside Strength",
  businessType: "gym",
  activeClients: 75,
  currentTool: "Mindbody",
  email: "owner@eastside.com",
  phone: "(555) 123-4567",
};

describe("POST /api/demo", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Resend admin-alert call is the only outbound fetch.
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 })
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns 200 with id for a valid submission", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(typeof json.id).toBe("string");
    expect(json.id.startsWith("DEMO")).toBe(true);
  });

  it("fires the admin alert email with the captured fields", async () => {
    await POST(makeRequest(validBody));
    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");

    const body = JSON.parse(opts!.body as string);
    expect(body.to).toEqual(["team@fieldday.app"]);
    expect(body.subject).toContain("New demo request");
    expect(body.subject).toContain("Eastside Strength");
    expect(body.html).toContain("Eastside Strength");
    expect(body.html).toContain("gym");
    expect(body.html).toContain("owner@eastside.com");
    expect(body.html).toContain("(555) 123-4567");
    expect(body.html).toContain("75");
    expect(body.html).toContain("Mindbody");
  });

  it("still returns 200 even when the admin email send fails", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("boom", { status: 500 }));
    const res = await POST(makeRequest(validBody));
    // Lead is more important than notification — do not leak infra errors.
    expect(res.status).toBe(200);
  });

  it("accepts a minimal submission (no active clients, tool, or phone)", async () => {
    const res = await POST(
      makeRequest({
        businessName: "Solo Dojo",
        businessType: "martial_arts",
        email: "sensei@solodojo.com",
      })
    );
    expect(res.status).toBe(200);
  });

  it("400 when businessName missing", async () => {
    const res = await POST(
      makeRequest({ ...validBody, businessName: "" })
    );
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toMatch(/business name/i);
  });

  it("400 when businessType missing", async () => {
    const res = await POST(makeRequest({ ...validBody, businessType: "" }));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toMatch(/business type/i);
  });

  it("400 when businessType is not in the allowed list", async () => {
    const res = await POST(
      makeRequest({ ...validBody, businessType: "restaurant" })
    );
    expect(res.status).toBe(400);
  });

  it("400 when email is invalid", async () => {
    const res = await POST(
      makeRequest({ ...validBody, email: "not-an-email" })
    );
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toMatch(/email/i);
  });

  it("400 when activeClients is negative", async () => {
    const res = await POST(
      makeRequest({ ...validBody, activeClients: -5 })
    );
    expect(res.status).toBe(400);
  });

  it("400 when activeClients is non-numeric", async () => {
    const res = await POST(
      makeRequest({ ...validBody, activeClients: "lots" })
    );
    expect(res.status).toBe(400);
  });

  it("400 when businessName is absurdly long (spam guard)", async () => {
    const res = await POST(
      makeRequest({ ...validBody, businessName: "x".repeat(500) })
    );
    expect(res.status).toBe(400);
  });

  it("400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("accepts every valid businessType value", async () => {
    const types = [
      "gym",
      "martial_arts",
      "tennis",
      "hockey",
      "dance",
      "tutoring",
      "other",
    ];
    for (const t of types) {
      const res = await POST(
        makeRequest({ ...validBody, businessType: t })
      );
      expect(res.status, `type=${t}`).toBe(200);
    }
  });
});
