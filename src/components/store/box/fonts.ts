import { Caveat, Homemade_Apple, Kalam } from "next/font/google";

/** Handwriting for the gift card. Loaded only on the box builder and order pages that show a card. */
export const kalam = Kalam({ weight: ["400", "700"], subsets: ["latin", "devanagari"], display: "swap", variable: "--font-kalam" });
export const caveat = Caveat({ weight: ["500", "700"], subsets: ["latin"], display: "swap", variable: "--font-caveat" });
export const homemadeApple = Homemade_Apple({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-apple" });
export const cardFontVars = `${kalam.variable} ${caveat.variable} ${homemadeApple.variable}`;
export const CARD_FONT_FAMILY: Record<string, string> = {
  kalam: "var(--font-kalam), cursive",
  caveat: "var(--font-caveat), cursive",
  apple: "var(--font-apple), cursive",
};
