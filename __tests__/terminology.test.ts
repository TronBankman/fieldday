/**
 * Tests for src/lib/terminology.ts — per-org label resolution.
 *
 * Covers the three required scenarios:
 *   1. Default fallback   — no orgId / no overrides → built-in defaults
 *   2. Override applied   — singular override → returned verbatim
 *   3. Pluralization      — singular override "client" → plural "clients"
 *
 * The async `t()` is tested against a mocked Supabase client. The pure
 * helpers (`resolveTerm`, `pluralize`) are tested directly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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
  pluralize,
  DEFAULT_TERMS,
} from "@/src/lib/terminology";

describe("DEFAULT_TERMS", () => {
  it("includes singular and plural keys for every core noun", () => {
    expect(DEFAULT_TERMS.player).toBe("player");
    expect(DEFAULT_TERMS.players).toBe("players");
    expect(DEFAULT_TERMS.coach).toBe("coach");
    expect(DEFAULT_TERMS.coaches).toBe("coaches");
    expect(DEFAULT_TERMS.team).toBe("team");
    expect(DEFAULT_TERMS.teams).toBe("teams");
  });

  it("is immutable at runtime", () => {
    expect(() => {
      (DEFAULT_TERMS as Record<string, string>).player = "hacked";
    }).toThrow();
  });
});

describe("pluralize", () => {
  it("adds 's' for regular words", () => {
    expect(pluralize("player")).toBe("players");
    expect(pluralize("client")).toBe("clients");
    expect(pluralize("team")).toBe("teams");
  });

  it("adds 'es' for -ch / -sh / -s / -x / -z endings", () => {
    expect(pluralize("coach")).toBe("coaches");
    expect(pluralize("class")).toBe("classes");
    expect(pluralize("bus")).toBe("buses");
    expect(pluralize("box")).toBe("boxes");
  });

  it("converts consonant+y to -ies", () => {
    expect(pluralize("party")).toBe("parties");
  });

  it("keeps vowel+y as +s", () => {
    expect(pluralize("day")).toBe("days");
  });

  it("returns empty for empty input", () => {
    expect(pluralize("")).toBe("");
    expect(pluralize("   ")).toBe("");
  });
});

describe("resolveTerm (pure)", () => {
  it("falls back to the default when overrides are null/undefined/empty", () => {
    expect(resolveTerm("player", null)).toBe("player");
    expect(resolveTerm("player", undefined)).toBe("player");
    expect(resolveTerm("player", {})).toBe("player");
    expect(resolveTerm("players", {})).toBe("players");
  });

  it("falls back to the default when override is whitespace-only", () => {
    expect(resolveTerm("player", { player: "   " })).toBe("player");
  });

  it("returns the override when set", () => {
    expect(resolveTerm("player", { player: "client" })).toBe("client");
    expect(resolveTerm("coach", { coach: "instructor" })).toBe("instructor");
    expect(resolveTerm("team", { team: "group" })).toBe("group");
  });

  it("pluralizes a singular override when the plural key has no override", () => {
    expect(resolveTerm("players", { player: "client" })).toBe("clients");
    expect(resolveTerm("coaches", { coach: "instructor" })).toBe("instructors");
    expect(resolveTerm("teams", { team: "group" })).toBe("groups");
  });

  it("prefers an explicit plural override over the derived plural", () => {
    // Lets orgs handle irregulars like child → children.
    expect(
      resolveTerm("players", { player: "child", players: "children" }),
    ).toBe("children");
  });
});

describe("t(key, orgId) — async DB-backed lookup", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it("returns the default when orgId is null (default fallback)", async () => {
    expect(await t("player", null)).toBe("player");
    expect(await t("players", null)).toBe("players");
    expect(await t("coach", undefined)).toBe("coach");
    // No DB call should have been made.
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it("returns the default when the org has no overrides stored", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { organization_terminology: {} },
      error: null,
    });
    expect(await t("player", "org_123")).toBe("player");
    expect(await t("players", "org_123")).toBe("players");
  });

  it("applies a singular override from the settings row", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { organization_terminology: { player: "client" } },
      error: null,
    });
    expect(await t("player", "org_gym")).toBe("client");
  });

  it("pluralizes a singular override when the plural key is requested", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { organization_terminology: { player: "client" } },
      error: null,
    });
    // player → client, so players → clients (auto-pluralized).
    expect(await t("players", "org_gym")).toBe("clients");
  });

  it("returns the default when the org row is missing", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await t("player", "org_nonexistent")).toBe("player");
  });

  it("returns the default when Supabase reports an error", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    expect(await t("player", "org_broken")).toBe("player");
  });

  it("returns the default when the organization_terminology column is null", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { organization_terminology: null },
      error: null,
    });
    expect(await t("player", "org_null_col")).toBe("player");
  });
});
