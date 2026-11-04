import type { CSSProperties } from "react";

/** Re-points ink/muted tokens so fields, text-ink and text-muted read correctly on a paper panel. */
export const paperVars = {
  "--ink": "var(--paper-ink)",
  "--muted": "color-mix(in srgb, var(--paper-ink) 72%, var(--paper))",
  borderRadius: "var(--radius)",
} as CSSProperties;
