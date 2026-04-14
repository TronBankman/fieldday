export function normalizeRole(value: string): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "forward") return "Forward";
  if (normalized === "defence" || normalized === "defense") return "Defence";
  if (normalized === "goalie" || normalized === "goaltender") return "Goalie";
  if (normalized === "skater") return "Skater";
  return "";
}

export function isEmail(value: string): boolean {
  return /.+@.+\..+/.test(String(value || ""));
}

export function parseOptionalBirthYear(
  value: string | number | null | undefined
): number | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const year = Number(raw);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return NaN;
  return year;
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
