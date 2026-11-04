"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, House, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { BagCount } from "./header";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  { href: "/shop", label: "Shop", icon: LayoutGrid, match: (p: string) => p.startsWith("/shop") || p.startsWith("/product") },
  { href: "/wishlist", label: "Wishlist", icon: Heart, match: (p: string) => p.startsWith("/wishlist") },
  { href: "/cart", label: "Bag", icon: ShoppingBag, match: (p: string) => p.startsWith("/cart") },
  { href: "/account", label: "Account", icon: User, match: (p: string) => p.startsWith("/account") || p.startsWith("/login") },
];

/** App-style bottom navigation for phones and tablets. */
export function TabBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/checkout")) return null;
  return (
    <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-40 bg-surface lg:hidden" style={{ paddingBottom: "var(--safe-bottom)" }}>
      <ul className="grid h-16 grid-cols-5">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? "page" : undefined} className={cn("flex h-full flex-col items-center justify-center gap-1 text-[12px] font-medium transition-colors", active ? "text-ink" : "text-muted")}>
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.6} aria-hidden />
                  {t.href === "/cart" && <BagCount className="-right-2.5 -top-1.5" />}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
