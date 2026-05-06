import { describe, it, expect } from "vitest";
import {
  getTerms,
  getPresetColor,
  isValidPreset,
  PRESETS,
  PRESET_COLORS,
} from "../../lib/terminology";

describe("lib/terminology (preset-based)", () => {
  it("returns correct labels for sports preset", () => {
    const terms = getTerms("sports");
    expect(terms.participant).toBe("Player");
    expect(terms.participants).toBe("Players");
    expect(terms.session).toBe("Session");
    expect(terms.sessions).toBe("Sessions");
    expect(terms.roster).toBe("Team");
  });

  it("returns correct labels for fitness preset", () => {
    const terms = getTerms("fitness");
    expect(terms.participant).toBe("Member");
    expect(terms.participants).toBe("Members");
    expect(terms.session).toBe("Class");
    expect(terms.sessions).toBe("Classes");
    expect(terms.roster).toBe("Group");
  });

  it("returns correct labels for dance preset", () => {
    const terms = getTerms("dance");
    expect(terms.participant).toBe("Dancer");
    expect(terms.participants).toBe("Dancers");
    expect(terms.session).toBe("Class");
    expect(terms.sessions).toBe("Classes");
    expect(terms.roster).toBe("Troupe");
  });

  it("returns correct labels for tutoring preset", () => {
    const terms = getTerms("tutoring");
    expect(terms.participant).toBe("Student");
    expect(terms.participants).toBe("Students");
    expect(terms.session).toBe("Lesson");
    expect(terms.sessions).toBe("Lessons");
    expect(terms.roster).toBe("Cohort");
  });

  it("falls back to sports on unknown input", () => {
    const terms = getTerms("unknown");
    expect(terms).toEqual(PRESETS.sports);
  });

  it("falls back to sports on empty string", () => {
    const terms = getTerms("");
    expect(terms).toEqual(PRESETS.sports);
  });

  it("validates known presets", () => {
    expect(isValidPreset("sports")).toBe(true);
    expect(isValidPreset("fitness")).toBe(true);
    expect(isValidPreset("dance")).toBe(true);
    expect(isValidPreset("tutoring")).toBe(true);
    expect(isValidPreset("unknown")).toBe(false);
    expect(isValidPreset("")).toBe(false);
  });

  it("returns correct default colors for each preset", () => {
    expect(getPresetColor("sports")).toBe("#0d6efd");
    expect(getPresetColor("fitness")).toBe("#16a34a");
    expect(getPresetColor("dance")).toBe("#d946ef");
    expect(getPresetColor("tutoring")).toBe("#f59e0b");
  });

  it("falls back to sports color on unknown preset", () => {
    expect(getPresetColor("unknown")).toBe(PRESET_COLORS.sports);
  });
});
