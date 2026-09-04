export const DEFAULT_INITIATIVE_PRIORITY = 3;
export const DEFAULT_INITIATIVE_COLOR = "#8B5CF6";

export function parseInitiativePriorityInput(
  raw: string,
): { ok: true; value: number } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false };
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > 99) return { ok: false };
  return { ok: true, value: n };
}
