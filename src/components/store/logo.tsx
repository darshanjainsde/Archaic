/**
 * Archaic Candles wordmark: pillar-and-flame mark, spaced serif capitals, a rule, and "CANDLES".
 * Drawn as SVG so it is crisp at any size and takes the current text colour (works on light and dark themes).
 * Admin can still upload an image logo (Appearance → Brand); when set, the header uses that instead.
 */
export function ArchaicLogo({ className, title = "Archaic Candles", word = "ARCHAIC" }: { className?: string; title?: string; word?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 64" role="img" aria-label={title}>
      <g fill="currentColor">
        <path d="M14 2c-5 8-6 11-6 14a6 6 0 0 0 12 0c0-3-1-6-6-14z" />
        <rect x="4" y="24" width="20" height="3.2" />
        <rect x="5.5" y="29" width="2.4" height="21" />
        <rect x="12.8" y="29" width="2.4" height="21" />
        <rect x="20.1" y="29" width="2.4" height="21" />
        <rect x="4" y="52" width="20" height="3" />
        <rect x="2" y="58" width="24" height="3.4" />
      </g>
      <text x="172" y="31" textAnchor="middle" fontFamily="var(--font-logo), Marcellus, Optima, Candara, serif" fontSize="30" letterSpacing="6.5" fill="currentColor">{word}</text>
      <rect x="62" y="40" width="220" height="1.2" fill="currentColor" />
      <text x="172" y="58" textAnchor="middle" fontFamily="var(--font-logo), Marcellus, Optima, Candara, serif" fontSize="11.5" letterSpacing="12" fill="currentColor">CANDLES</text>
    </svg>
  );
}
