/** Helpers for reading FormData in server actions. */
export const fstr = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
export const fbool = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return v === "on" || v === "true" || v === "1";
};
export const fint = (fd: FormData, k: string, fallback = 0) => {
  const n = Number(fstr(fd, k));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};
export const fdate = (fd: FormData, k: string): Date | null => {
  const s = fstr(fd, k);
  if (!s) return null;
  // datetime-local values are entered in India time
  const d = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(s) ? s : `${s}${s.length <= 10 ? "T00:00" : ""}:00+05:30`.replace(/:00:00\+/, ":00+"));
  return Number.isNaN(d.getTime()) ? null : d;
};
/** Format a Date for <input type="datetime-local"> in India time. */
export function toLocalInput(d: Date | null | undefined) {
  if (!d) return "";
  const ist = new Date(d.getTime() + 5.5 * 3600000);
  return ist.toISOString().slice(0, 16);
}
