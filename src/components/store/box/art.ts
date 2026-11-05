import type { BoxShape } from "@/lib/box/schema";
import type { CatalogDecor } from "@/lib/box/core";

/** Drawing helpers shared by the 2D plan, the bag thumbnail and the order's packing plan. */

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt));
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** CSS background for a box finish (plan view and swatches). A photo wins over the pattern. */
export function finishCss(d: Pick<CatalogDecor, "color" | "pattern" | "image">) {
  if (d.image) return `center/cover url("${d.image}")`;
  const c = d.color;
  switch (d.pattern) {
    case "marbled": return `radial-gradient(60% 40% at 20% 30%, ${shade(c, 20)}, transparent 70%), radial-gradient(50% 35% at 75% 70%, ${shade(c, -15)}, transparent 70%), radial-gradient(40% 30% at 60% 20%, #d7c7a8, transparent 70%), #eae3d6`;
    case "blockprint": return `radial-gradient(circle at 50% 50%, #f1e6cf 0 3px, transparent 3.5px) 0 0/22px 22px, radial-gradient(circle at 50% 50%, #c96b3c 0 2px, transparent 2.5px) 11px 11px/22px 22px, ${c}`;
    case "foil": return `radial-gradient(circle, #d6a740 0 1.5px, transparent 2px) 0 0/16px 16px, ${c}`;
    case "wood": return `repeating-linear-gradient(90deg, ${shade(c, 6)} 0 18px, ${shade(c, -6)} 18px 22px, ${shade(c, 10)} 22px 46px, ${shade(c, -14)} 46px 49px)`;
    case "kraft": return `repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px), ${c}`;
    default: return c;
  }
}

/** Squiggle filler as a CSS background. */
export function fillerCss(color: string) {
  const sv = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><g fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity=".85"><path d="M3 10q6-8 12 0t12 0"/><path d="M14 26q5-7 10 0t10 0"/><path d="M2 34q4-5 8 0"/><path d="M28 6q3-4 6 0"/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(sv)}") 0 0/40px 40px, ${shade(color, 70)}`;
}

/** Top-down drawing of an item without a photo, sized to its footprint (100 units per space). */
export function itemSvg(shape: BoxShape, color: string, w: number, h: number) {
  const W = 100 * w, H = 100 * h, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 8;
  let s = "";
  switch (shape) {
    case "jar":
      s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#7a3f12" opacity=".9"/><circle cx="${cx}" cy="${cy}" r="${R - 7}" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="3" fill="#2a1a0a"/>`;
      break;
    case "dome":
      s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#d8e6e4" opacity=".85"/><circle cx="${cx}" cy="${cy}" r="${R * 0.6}" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="4" fill="#2a1a0a"/>`;
      break;
    case "tin":
      s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${shade(color, -30)}"/><circle cx="${cx}" cy="${cy}" r="${R - 6}" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="${R * 0.5}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`;
      break;
    case "figure":
      s = `<ellipse cx="${cx}" cy="${cy + R * 0.5}" rx="${Math.min(W, H) * 0.38}" ry="${R * 0.24}" fill="${shade(color, -50)}"/><ellipse cx="${cx}" cy="${cy + R * 0.08}" rx="${Math.min(W, H) * 0.26}" ry="${R * 0.5}" fill="${color}"/><circle cx="${cx}" cy="${cy - R * 0.45}" r="${Math.min(W, H) * 0.17}" fill="${shade(color, 15)}"/>`;
      break;
    case "flat":
      s = `<rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="4" fill="${color}"/><rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2"/>`;
      break;
    default:
      s = `<rect x="8" y="10" width="${W - 16}" height="${H - 20}" rx="5" fill="${color}"/><rect x="${W * 0.34}" y="10" width="${W * 0.32}" height="${H - 20}" fill="#efe1c4" opacity=".85"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${s}</svg>`;
}

export const ownGiftSvg = (w: number, h: number) => {
  const W = 100 * w, H = 100 * h, cx = W / 2, cy = H / 2;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="rgba(255,250,241,.6)" stroke="#a85a1f" stroke-width="3" stroke-dasharray="10 8"/><g transform="translate(${cx - 20} ${cy - 24})"><rect x="2" y="16" width="36" height="26" fill="#a85a1f"/><rect x="0" y="9" width="40" height="9" fill="#c46f2d"/><rect x="17" y="9" width="6" height="33" fill="#f3d9a6"/></g></svg>`;
};

/** Small top-down picture of a box for the bag and order lists. */
export function boxThumb(o: { cols: number; rows: number; finish: string; filler: string; items: { x: number; y: number; w: number; h: number; color: string; shape: BoxShape }[]; own?: { x: number; y: number; w: number; h: number } | null }) {
  const c = 20, pad = 8, W = o.cols * c + pad * 2, H = o.rows * c + pad * 2;
  let s = `<rect width="${W}" height="${H}" rx="3" fill="${o.finish}"/><rect x="${pad}" y="${pad}" width="${o.cols * c}" height="${o.rows * c}" fill="${shade(o.filler, 60)}"/>`;
  for (let x = 1; x < o.cols; x++) s += `<line x1="${pad + x * c}" y1="${pad}" x2="${pad + x * c}" y2="${pad + o.rows * c}" stroke="rgba(90,60,30,.22)"/>`;
  for (let y = 1; y < o.rows; y++) s += `<line x1="${pad}" y1="${pad + y * c}" x2="${pad + o.cols * c}" y2="${pad + y * c}" stroke="rgba(90,60,30,.22)"/>`;
  for (const i of o.items) {
    const x = pad + i.x * c, y = pad + i.y * c, w = i.w * c, h = i.h * c;
    s += i.shape === "jar" || i.shape === "tin" || i.shape === "dome"
      ? `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) / 2 - 2}" fill="${i.color}" stroke="${shade(i.color, -60)}" stroke-width="2"/>`
      : `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" rx="2" fill="${i.color}"/>`;
  }
  if (o.own) s += `<rect x="${pad + o.own.x * c + 2}" y="${pad + o.own.y * c + 2}" width="${o.own.w * c - 4}" height="${o.own.h * c - 4}" fill="none" stroke="#a85a1f" stroke-width="2" stroke-dasharray="4 3"/>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${s}</svg>`)}`;
}
