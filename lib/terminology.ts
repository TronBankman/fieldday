/**
 * Preset-based terminology module for org signup (Chunk 6).
 *
 * Maps a terminology preset (sports/fitness/dance/tutoring) to
 * human-friendly labels used in the admin UI and welcome banner.
 *
 * This is separate from src/lib/terminology.ts which handles
 * per-key overrides via the JSONB column. The preset drives the
 * initial default label set for new orgs; admins can further
 * customize via the Settings tab.
 */

export type Preset = "sports" | "fitness" | "dance" | "tutoring";

export interface Terms {
  participant: string;
  participants: string;
  session: string;
  sessions: string;
  roster: string;
}

export const PRESETS: Record<Preset, Terms> = {
  sports: {
    participant: "Player",
    participants: "Players",
    session: "Session",
    sessions: "Sessions",
    roster: "Team",
  },
  fitness: {
    participant: "Member",
    participants: "Members",
    session: "Class",
    sessions: "Classes",
    roster: "Group",
  },
  dance: {
    participant: "Dancer",
    participants: "Dancers",
    session: "Class",
    sessions: "Classes",
    roster: "Troupe",
  },
  tutoring: {
    participant: "Student",
    participants: "Students",
    session: "Lesson",
    sessions: "Lessons",
    roster: "Cohort",
  },
};

const VALID_PRESETS = new Set<string>(Object.keys(PRESETS));

export function isValidPreset(value: string): value is Preset {
  return VALID_PRESETS.has(value);
}

/**
 * Returns the Terms for a given preset string.
 * Falls back to "sports" on unknown input.
 */
export function getTerms(preset: string): Terms {
  if (isValidPreset(preset)) return PRESETS[preset];
  return PRESETS.sports;
}

/**
 * Maps preset to a default primary color for new orgs.
 */
export const PRESET_COLORS: Record<Preset, string> = {
  sports: "#0d6efd",
  fitness: "#16a34a",
  dance: "#d946ef",
  tutoring: "#f59e0b",
};

export function getPresetColor(preset: string): string {
  if (isValidPreset(preset)) return PRESET_COLORS[preset];
  return PRESET_COLORS.sports;
}
