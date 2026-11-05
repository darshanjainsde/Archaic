/** Small brand-neutral social icons (24×24, currentColor). Display only. */
export type SocialKey = "instagram" | "facebook" | "youtube" | "pinterest" | "x" | "whatsapp" | "mapsUrl";

const PATHS: Record<SocialKey, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
    </>
  ),
  facebook: <path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3Z" />,
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path fill="currentColor" d="M10 9v6l5.2-3L10 9Z" />
    </>
  ),
  pinterest: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M10.6 20.4 12.3 13M9.4 12.6c-.6-2.6 1-4.9 3.4-4.9 2.2 0 3.4 1.5 3.2 3.4-.2 2-1.4 3.4-2.8 3.3-.8 0-1.4-.6-1.3-1.4" />
    </>
  ),
  x: <path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />,
  whatsapp: (
    <>
      <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4l-4.5 1.1Z" />
      <path fill="currentColor" d="M9.2 7.8c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.3.6 1.4 1.9 2.8 2.4.2.1.4 0 .5-.1l.7-.8c.1-.2.3-.2.5-.1l1.5.7c.2.1.4.2.4.4 0 .3 0 1-.5 1.5s-1.4.8-2.1.6c-.7-.2-2.4-.7-3.8-2.2-1.5-1.5-2-3-2.1-3.4-.1-.6.1-1.6.3-2.3Z" />
    </>
  ),
  mapsUrl: (
    <>
      <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
};

export const SOCIAL_LABELS: Record<SocialKey, string> = {
  instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", pinterest: "Pinterest", x: "X (Twitter)", whatsapp: "WhatsApp", mapsUrl: "Find us on the map",
};

export function SocialIcon({ name, size = 22, className }: { name: SocialKey; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      {PATHS[name]}
    </svg>
  );
}

/** Builds the link for a stored value: WhatsApp numbers become wa.me links, everything else is used as given. */
export function socialHref(key: SocialKey, value: string): string {
  if (key === "whatsapp") return `https://wa.me/${value.replace(/\D/g, "")}`;
  return value;
}
