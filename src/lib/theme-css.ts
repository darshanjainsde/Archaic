import type { ThemeSettings } from "./settings-schema";
import { fontVar } from "./fonts-list";

/** Builds the :root custom properties from the admin theme. Values are validated hex, so this is injection-safe. */
export function themeToCss(t: ThemeSettings): string {
  const c = t.colors;
  const safe = (v: string) => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000");
  const radius = Math.max(0, Math.min(28, Number(t.radius) || 0));
  const btnRadius = t.buttonShape === "pill" ? "999px" : `${Math.min(radius, 6)}px`;
  return `:root{--bg:${safe(c.bg)};--surface:${safe(c.surface)};--ink:${safe(c.ink)};--muted:color-mix(in oklab, ${safe(c.muted)} 70%, ${safe(c.ink)});--accent:${safe(c.accent)};--accent-ink:${safe(c.accentInk)};--field:${safe(c.field)};--field-ink:${safe(c.fieldInk)};--paper:${safe(c.paper)};--paper-ink:${safe(c.paperInk)};--sale:${safe(c.sale)};--radius:${radius}px;--btn-radius:${btnRadius};--font-display:var(${fontVar(t.displayFont)});--font-body:var(${fontVar(t.bodyFont)});--heading-weight:${Number(t.headingWeight) || 500};}`;
}
