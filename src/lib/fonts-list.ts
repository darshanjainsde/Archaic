/** Font keys the admin can choose. Each maps to a CSS variable defined by next/font in src/app/fonts.ts */
export const FONT_OPTIONS = [
  { key: "fraunces", label: "Fraunces (soft serif)", cssVar: "--font-fraunces", kind: "serif" },
  { key: "cormorant", label: "Cormorant Garamond (classic serif)", cssVar: "--font-cormorant", kind: "serif" },
  { key: "playfair", label: "Playfair Display (high contrast serif)", cssVar: "--font-playfair", kind: "serif" },
  { key: "lora", label: "Lora (book serif)", cssVar: "--font-lora", kind: "serif" },
  { key: "manrope", label: "Manrope (modern sans)", cssVar: "--font-manrope", kind: "sans" },
  { key: "inter", label: "Inter (neutral sans)", cssVar: "--font-inter", kind: "sans" },
  { key: "dmsans", label: "DM Sans (friendly sans)", cssVar: "--font-dmsans", kind: "sans" },
  { key: "jost", label: "Jost (geometric sans)", cssVar: "--font-jost", kind: "sans" },
] as const;

export type FontKey = (typeof FONT_OPTIONS)[number]["key"];
export const FONT_KEYS = FONT_OPTIONS.map((f) => f.key) as [FontKey, ...FontKey[]];

export function fontVar(key: string): string {
  return FONT_OPTIONS.find((f) => f.key === key)?.cssVar ?? "--font-manrope";
}
