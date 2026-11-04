import Link from "next/link";

export function EmptyState({ title, text, href, cta }: { title: string; text?: string; href?: string; cta?: string }) {
  return (
    <div className="flex flex-col items-start gap-4 bg-surface p-8 md:p-12" style={{ borderRadius: "var(--radius)" }}>
      <h2 className="text-3xl md:text-4xl">{title}</h2>
      {text && <p className="max-w-lg text-[17px]">{text}</p>}
      {href && cta && <Link href={href} className="btn btn-primary">{cta}</Link>}
    </div>
  );
}
