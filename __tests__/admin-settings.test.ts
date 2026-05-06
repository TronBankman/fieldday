/**
 * Tests for /api/org/admin/settings
 *
 * Covers the organization_terminology override flow:
 *   GET  — returns the stored overrides (empty object by default)
 *   PATCH — persists sanitized overrides, ignores unknown keys,
 *           drops empty/whitespace values (clearing an override).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock jsonwebtoken so getAdminOrgId() sees a valid admin.
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn().mockReturnValue({ sub: "org_bcfalcons", role: "admin" }),
    sign: vi.fn(),
  },
}));

// Mock Supabase with capture hooks so we can assert what got written.
const mockMaybeSingle = vi.fn();
const updateCapture = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: () => ({
      // GET path: select().eq().maybeSingle()
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
      // PATCH path: update().eq().select().maybeSingle()
      update: (payload: unknown) => {
        updateCapture(payload);
        return {
          eq: () => ({
            select: () => ({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        };
      },
    }),
  }),
}));

process.env.JWT_SECRET = "test-secret";

import { GET, PATCH } from "../app/api/org/admin/settings/route";

function authedGet(): NextRequest {
  return new NextRequest("http://localhost/api/org/admin/settings", {
    method: "GET",
    headers: { Authorization: "Bearer valid-admin-token" },
  });
}

function authedPatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/org/admin/settings", {
    method: "PATCH",
    headers: {
      Authorization: "Bearer valid-admin-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("GET /api/org/admin/settings", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    updateCapture.mockReset();
  });

  it("returns the stored terminology for the admin's org", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { organization_terminology: { player: "client", coach: "instructor" } },
      error: null,
    });
    const res = await GET(authedGet());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { terminology: Record<string, string> };
    expect(json.terminology).toEqual({ player: "client", coach: "instructor" });
  });

  it("returns an empty object when no overrides are set", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { organization_terminology: {} },
      error: null,
    });
    const res = await GET(authedGet());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { terminology: Record<string, string> };
    expect(json.terminology).toEqual({});
  });

  it("returns 401 when no auth header is sent", async () => {
    const req = new NextRequest("http://localhost/api/org/admin/settings", {
      method: "GET",
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/org/admin/settings", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    updateCapture.mockReset();
  });

  it("persists sanitized terminology overrides", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { organization_terminology: { player: "client", coach: "instructor", team: "group" } },
      error: null,
    });
    const res = await PATCH(
      authedPatch({
        terminology: {
          player: "  client  ",
          coach: "instructor",
          team: "group",
        },
      })
    );
    expect(res.status).toBe(200);
    expect(updateCapture).toHaveBeenCalledWith({
      organization_terminology: {
        player: "client",
        coach: "instructor",
        team: "group",
      },
    });
  });

  it("drops empty strings (clears an override)", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { organization_terminology: { coach: "instructor" } },
      error: null,
    });
    const res = await PATCH(
      authedPatch({
        terminology: { player: "", coach: "instructor", team: "   " },
      })
    );
    expect(res.status).toBe(200);
    const written = updateCapture.mock.calls[0][0] as {
      organization_terminology: Record<string, string>;
    };
    expect(written.organization_terminology).toEqual({ coach: "instructor" });
  });

  it("ignores unknown keys", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { organization_terminology: { player: "client" } },
      error: null,
    });
    const res = await PATCH(
      authedPatch({
        terminology: { player: "client", sport: "hacked", __proto__: "x" },
      })
    );
    expect(res.status).toBe(200);
    const written = updateCapture.mock.calls[0][0] as {
      organization_terminology: Record<string, string>;
    };
    expect(written.organization_terminology).toEqual({ player: "client" });
  });

  it("rejects requests without a terminology object", async () => {
    const res = await PATCH(authedPatch({ foo: "bar" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const req = new NextRequest("http://localhost/api/org/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terminology: { player: "client" } }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });
});
