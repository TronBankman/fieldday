/**
 * ID generator — ported from Falcons codebase.
 * Generates prefixed IDs like REG-1713045600000-a3b2c
 */
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
