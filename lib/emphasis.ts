// client-safe: do NOT import "server-only" (used by client components in the browser)

/**
 * True when an item should render emphasized.
 * - Empty/blank-only emphasis means "no tailoring", so everything is emphasized (primary color).
 * - Otherwise an item is emphasized when any emphasis keyword case-insensitively
 *   appears within any of its candidate strings (id, label, items, tags).
 */
export function matchesEmphasis(emphasis: string[], ...candidates: string[]): boolean {
  const keys = emphasis.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (keys.length === 0) return true;
  const hay = candidates.map((c) => c.toLowerCase());
  return keys.some((k) => hay.some((c) => c.includes(k)));
}
