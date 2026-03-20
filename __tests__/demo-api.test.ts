import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/demo/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/demo", () => {
  it("returns 200 for a valid submission", async () => {
    const req = makeRequest({
      name: "Jane Smith",
      org: "BC Falcons Hockey",
      email: "jane@bcfalcons.com",
      sport: "hockey",
      currentTool: "spreadsheets",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it("returns 400 when name is missing", async () => {
    const req = makeRequest({
      name: "",
      org: "BC Falcons Hockey",
      email: "jane@bcfalcons.com",
      sport: "hockey",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it("returns 400 when email is invalid", async () => {
    const req = makeRequest({
      name: "Jane Smith",
      org: "BC Falcons Hockey",
      email: "not-an-email",
      sport: "hockey",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect((json as { error: string }).error).toMatch(/email/i);
  });

  it("returns 400 when sport is not in the allowed list", async () => {
    const req = makeRequest({
      name: "Jane Smith",
      org: "BC Falcons Hockey",
      email: "jane@bcfalcons.com",
      sport: "curling",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when org is missing", async () => {
    const req = makeRequest({
      name: "Jane Smith",
      org: "",
      email: "jane@bcfalcons.com",
      sport: "soccer",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("accepts a valid submission without currentTool", async () => {
    const req = makeRequest({
      name: "Alex Chen",
      org: "Valley United FC",
      email: "alex@valleyunited.com",
      sport: "soccer",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
