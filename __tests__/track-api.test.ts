/**
 * Tests for /api/track — funnel event ingestion.
 *
 * Same fall-through pattern as /api/demo: Supabase is intentionally
 * not configured here so the route exercises the console-log branch.
 * The contract is that tracking never errors the client, so we assert
 * 200 on every input shape (valid, invalid, malformed).
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

import { POST, VALID_EVENT_TYPES } from "../app/api/track/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json", "user-agent": "vitest" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/track", () => {
  it("returns 200 for a valid event", async () => {
    const res = await POST(
      makeRequest({
        session_id: "abc-123",
        event_type: "page_view_demo",
        path: "/demo",
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("accepts every event_type in the whitelist", async () => {
    for (const t of VALID_EVENT_TYPES) {
      const res = await POST(
        makeRequest({ session_id: "s", event_type: t })
      );
      expect(res.status, `event=${t}`).toBe(200);
    }
  });

  it("returns 200 (silently drops) when event_type is not whitelisted", async () => {
    const res = await POST(
      makeRequest({ session_id: "s", event_type: "buy_now" })
    );
    expect(res.status).toBe(200);
  });

  it("returns 200 (silently drops) when session_id is missing", async () => {
    const res = await POST(
      makeRequest({ event_type: "page_view_home" })
    );
    expect(res.status).toBe(200);
  });

  it("returns 200 on malformed JSON body", async () => {
    const req = new NextRequest("http://localhost/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("accepts optional metadata", async () => {
    const res = await POST(
      makeRequest({
        session_id: "s",
        event_type: "form_submit_success",
        metadata: { business_type: "gym" },
      })
    );
    expect(res.status).toBe(200);
  });

  it("does not crash on oversized metadata", async () => {
    const huge: Record<string, string> = {};
    for (let i = 0; i < 500; i++) huge[`k${i}`] = "x".repeat(100);
    const res = await POST(
      makeRequest({ session_id: "s", event_type: "form_start", metadata: huge })
    );
    expect(res.status).toBe(200);
  });
});
