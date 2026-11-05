import { Fraunces, Cormorant_Garamond, Playfair_Display, Lora, Manrope, Inter, DM_Sans, Jost, Marcellus } from "next/font/google";

// All selectable fonts are self-hosted at build time. Only the ones referenced by the theme are downloaded by browsers.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz", "SOFT"] });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cormorant", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", preload: false });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap", preload: false });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });
const dmsans = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans", display: "swap", preload: false });
// Logo face (Archaic wordmark): flared capitals like the brand mark
const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-logo", display: "swap" });
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap", preload: false });

export const fontVariables = [fraunces, cormorant, playfair, lora, manrope, inter, dmsans, jost, marcellus].map((f) => f.variable).join(" ");
