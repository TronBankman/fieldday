/**
 * Per-vertical swap tests for the t() terminology helper.
 *
 * Fieldday's hockey defaults must be overridable so the same product
 * sells to gyms, martial arts schools, and tennis clubs (5x the
 * addressable market vs. hockey-only). This file pins down the swaps
 * each vertical actually needs in marketing + admin copy, end-to-end:
 *
 *   1. The pure resolver (`resolveTerm`) handles the swap correctly,
 *      including auto-pluralization.
 *   2. The async `t()` helper applies the swap when given an org id.
 *   3. The public GET /api/org/terminology endpoint returns the
 *      resolved map when the proxy injects an `x-fieldday-org-terminology`
 *      header (the path the registration page actually uses).
 *
 * Each vertical block covers AT LEAST ONE swap that is meaningful for
 * that vertical's customer (not just symbolic strings).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock Supabase so the async t() can be exercised without a real DB. We
// reuse a single mock for every vertical and reset overrides per test.
// ---------------------------------------------------------------------------

const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  }),
}));

import {
  t,
  resolveTerm,
  type TerminologyOverrides,
} from "@/src/lib/terminology";
import { GET as terminologyGET } from "../app/api/org/terminology/route";

/**
 * Helper: build a fake NextRequest where the proxy already injected the
 * terminology header — exactly what /[org]/* requests look like server-side.
 */
function reqWithOverrides(overrides: TerminologyOverrides): NextRequest {
  return new NextRequest("http://localhost/api/org/terminology", {
    headers: {
      "x-fieldday-org-id": "org_test",
      "x-fieldday-org-terminology": JSON.stringify(overrides),
    },
  });
}

beforeEach(() => {
  mockMaybeSingle.mockReset();
});

// ---------------------------------------------------------------------------
// Gym vertical — players are clients, sessions are classes.
// ---------------------------------------------------------------------------

describe("gym vertical (player → client, session → class)", () => {
  const overrides: TerminologyOverrides = {
    player: "client",
    session: "class",
  };

  it("resolves singular and plural via the pure resolver", () => {
    expect(resolveTerm("player", overrides)).toBe("client");
    expect(resolveTerm("players", overrides)).toBe("clients");
    expect(resolveTerm("session", overrides)).toBe("class");
    // "class" -> "classes" via the -s/-x/-z/-ch/-sh +es rule.
    expect(resolveTerm("sessions", overrides)).toBe("classes");
  });

  it("applies the swap end-to-end via t(orgId)", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { organization_terminology: overrides },
      error: null,
    });
    expect(await t("player", "org_gym")).toBe("client");
    expect(await t("players", "org_gym")).toBe("clients");
  });

  it("returns the resolved map from GET /api/org/terminology", async () => {
    const res = await terminologyGET(reqWithOverrides(overrides));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { terms: Record<string, string> };
    expect(body.terms.player).toBe("client");
    expect(body.terms.players).toBe("clients");
    expect(body.terms.session).toBe("class");
    expect(body.terms.sessions).toBe("classes");
    // Unrelated keys keep their defaults.
    expect(body.terms.coach).toBe("coach");
  });
});

// ---------------------------------------------------------------------------
// Martial arts vertical — coaches are instructors, players are students.
// ---------------------------------------------------------------------------

describe("martial arts vertical (coach → instructor, player → student)", () => {
  const overrides: TerminologyOverrides = {
    coach: "instructor",
    player: "student",
  };

  it("resolves both swaps via the pure resolver", () => {
    expect(resolveTerm("coach", overrides)).toBe("instructor");
    expect(resolveTerm("coaches", overrides)).toBe("instructors");
    expect(resolveTerm("player", overrides)).toBe("student");
    expect(resolveTerm("players", overrides)).toBe("students");
  });

  it("applies the coach swap via t(orgId)", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { organization_terminology: overrides },
      error: null,
    });
    expect(await t("coach", "org_dojo")).toBe("instructor");
    expect(await t("coaches", "org_dojo")).toBe("instructors");
  });

  it("returns the swap from GET /api/org/terminology", async () => {
    const res = await terminologyGET(reqWithOverrides(overrides));
    const body = (await res.json()) as { terms: Record<string, string> };
    expect(body.terms.coach).toBe("instructor");
    expect(body.terms.coaches).toBe("instructors");
    expect(body.terms.player).toBe("student");
    expect(body.terms.players).toBe("students");
    // Team is NOT overridden — defaults still apply.
    expect(body.terms.team).toBe("team");
  });
});

// ---------------------------------------------------------------------------
// Tennis vertical — players are members, teams are clubs.
// ---------------------------------------------------------------------------

describe("tennis vertical (player → member, team → club)", () => {
  const overrides: TerminologyOverrides = {
    player: "member",
    team: "club",
  };

  it("resolves singular and plural via the pure resolver", () => {
    expect(resolveTerm("player", overrides)).toBe("member");
    expect(resolveTerm("players", overrides)).toBe("members");
    expect(resolveTerm("team", overrides)).toBe("club");
    expect(resolveTerm("teams", overrides)).toBe("clubs");
  });

  it("applies the player swap via t(orgId)", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { organization_terminology: overrides },
      error: null,
    });
    expect(await t("player", "org_tennis")).toBe("member");
    expect(await t("teams", "org_tennis")).toBe("clubs");
  });

  it("returns the swap from GET /api/org/terminology", async () => {
    const res = await terminologyGET(reqWithOverrides(overrides));
    const body = (await res.json()) as { terms: Record<string, string> };
    expect(body.terms.player).toBe("member");
    expect(body.terms.players).toBe("members");
    expect(body.terms.team).toBe("club");
    expect(body.terms.teams).toBe("clubs");
  });
});

// ---------------------------------------------------------------------------
// Default vertical (hockey) — no overrides means every label stays default.
// This guards against a regression where the resolver accidentally returns
// undefined / empty when overrides are missing.
// ---------------------------------------------------------------------------

describe("default (hockey) — no overrides", () => {
  it("returns defaults for every key from GET /api/org/terminology", async () => {
    const res = await terminologyGET(reqWithOverrides({}));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { terms: Record<string, string> };
    expect(body.terms.player).toBe("player");
    expect(body.terms.players).toBe("players");
    expect(body.terms.coach).toBe("coach");
    expect(body.terms.coaches).toBe("coaches");
    expect(body.terms.team).toBe("team");
    expect(body.terms.teams).toBe("teams");
  });

  it("falls back to defaults when the proxy header is malformed JSON", async () => {
    // The endpoint must NOT throw if the header is corrupt — it falls back
    // to the slow path (DB lookup) and from there to defaults.
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const req = new NextRequest("http://localhost/api/org/terminology", {
      headers: {
        "x-fieldday-org-id": "org_test",
        "x-fieldday-org-terminology": "{not valid json",
      },
    });
    const res = await terminologyGET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { terms: Record<string, string> };
    expect(body.terms.player).toBe("player");
  });
});

// ---------------------------------------------------------------------------
// Irregular plural — orgs can override the plural directly when the
// auto-pluralizer wouldn't produce the right English (e.g. child→children).
// ---------------------------------------------------------------------------

describe("explicit plural override (irregular plurals)", () => {
  it("uses the explicit plural override over the derived one", () => {
    const overrides: TerminologyOverrides = {
      player: "child",
      players: "children",
    };
    expect(resolveTerm("player", overrides)).toBe("child");
    expect(resolveTerm("players", overrides)).toBe("children");
  });
});
