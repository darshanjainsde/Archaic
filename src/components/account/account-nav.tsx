"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/membership", label: "Membership" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/profile", label: "Profile" },
];

export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/account" ? path === "/account" : path.startsWith(href));
  return (
    <nav aria-label="Account" className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-2 lg:flex-col lg:gap-1">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={active(l.href) ? "page" : undefined} className={cn("block whitespace-nowrap px-4 py-2.5 text-[16px] transition-colors", active(l.href) ? "bg-ink text-bg font-semibold" : "bg-surface hover:bg-[color-mix(in_srgb,var(--ink)_12%,var(--surface))]")} style={{ borderRadius: "var(--btn-radius)" }}>
              {l.label}
            </Link>
          </li>
        ))}
        {isAdmin && (
          <li><Link href="/admin" className="block whitespace-nowrap bg-accent px-4 py-2.5 text-[16px] font-semibold text-accent-ink" style={{ borderRadius: "var(--btn-radius)" }}>Admin panel</Link></li>
        )}
        <li>
          <form action={logout}>
            <button type="submit" className="block w-full whitespace-nowrap px-4 py-2.5 text-left text-[16px] underline-offset-4 hover:underline">Sign out</button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
