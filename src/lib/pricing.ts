import type { OptionGroup, Personalization, Selection, SelectionSnapshot } from "./types";

/** Pure pricing helpers shared by the product page (estimate) and the server (authoritative). */

export function parseOptions(raw: unknown): OptionGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g) => g && typeof g === "object" && Array.isArray((g as OptionGroup).values))
    .map((g: OptionGroup) => ({
      id: String(g.id),
      name: String(g.name ?? "Option"),
      display: g.display === "swatch" || g.display === "dropdown" || g.display === "candle" ? g.display : "button",
      required: g.required !== false,
      values: g.values.map((v) => ({
        id: String(v.id),
        label: String(v.label ?? ""),
        hex: v.hex ?? null,
        priceDelta: Number.isFinite(v.priceDelta) ? Math.trunc(v.priceDelta) : 0,
        image: v.image ?? null,
        available: v.available !== false,
        note: typeof v.note === "string" && v.note.trim() ? v.note.trim().slice(0, 40) : null,
      })),
    }));
}

export function parsePersonalization(raw: unknown): Personalization | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Personalization;
  if (!p.enabled) return null;
  return {
    enabled: true,
    label: p.label || "Personalised message",
    maxLength: Math.max(1, Math.min(200, Number(p.maxLength) || 40)),
    price: Math.max(0, Math.trunc(Number(p.price) || 0)),
    required: Boolean(p.required),
  };
}

export type LineResolution =
  | { ok: true; unitPrice: number; snapshot: SelectionSnapshot[]; personalization: string | null; optionImage: string | null }
  | { ok: false; error: string };

/** Validates selections against the product's option groups and computes the unit price. */
export function resolveLine(
  basePrice: number,
  groups: OptionGroup[],
  selections: Selection[],
  personalizationCfg: Personalization | null,
  personalizationText?: string | null,
): LineResolution {
  let unit = basePrice;
  const snapshot: SelectionSnapshot[] = [];
  let optionImage: string | null = null;
  const seen = new Set<string>();
  for (const sel of selections ?? []) {
    if (seen.has(sel.groupId)) return { ok: false, error: "Duplicate option selection" };
    seen.add(sel.groupId);
    if (!groups.some((g) => g.id === sel.groupId)) return { ok: false, error: "This option is no longer offered" };
  }
  for (const g of groups) {
    const sel = selections?.find((s) => s.groupId === g.id);
    if (!sel) {
      if (g.required && g.values.length > 0) return { ok: false, error: `Please choose a ${g.name.toLowerCase()}` };
      continue;
    }
    const v = g.values.find((x) => x.id === sel.valueId);
    if (!v) return { ok: false, error: `The ${g.name.toLowerCase()} you chose is no longer offered` };
    if (!v.available) return { ok: false, error: `${v.label} is currently unavailable` };
    unit += v.priceDelta;
    snapshot.push({ group: g.name, value: v.label, hex: v.hex ?? null });
    if (v.image && !optionImage) optionImage = v.image;
  }
  let text: string | null = null;
  const raw = (personalizationText ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (personalizationCfg) {
    if (raw.length > personalizationCfg.maxLength) return { ok: false, error: `Message is longer than ${personalizationCfg.maxLength} characters` };
    if (!raw && personalizationCfg.required) return { ok: false, error: `Please add the ${personalizationCfg.label.toLowerCase()}` };
    if (raw) {
      text = raw;
      unit += personalizationCfg.price;
    }
  }
  if (unit < 0) unit = 0;
  return { ok: true, unitPrice: unit, snapshot, personalization: text, optionImage };
}

export function lineKey(productId: string, selections: Selection[], personalization?: string | null): string {
  const sel = [...(selections ?? [])].sort((a, b) => a.groupId.localeCompare(b.groupId)).map((s) => `${s.groupId}:${s.valueId}`).join("|");
  return `${productId}__${sel}__${(personalization ?? "").trim()}`;
}
