export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Convert a zod error into a flat field -> message map. */
export function zodFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path.map(String).join(".") || "_";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

export function firstError(issues: { path: PropertyKey[]; message: string }[]): string {
  const i = issues[0];
  if (!i) return "Invalid input";
  const p = i.path.map(String).join(".");
  return p ? `${p}: ${i.message}` : i.message;
}
