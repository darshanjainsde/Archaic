"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { Sheet } from "@/components/ui/sheet";
import { Img } from "@/components/ui/img";
import { cn } from "@/lib/utils";

type Link = { label: string; href: string };

export function BagCount({ className }: { className?: string }) {
  const { count } = useCart();
  if (!count) return null;
  return (
    <span className={cn("absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-accent-ink tabular-nums", className)} aria-hidden>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function BagLabel() {
  const { count } = useCart();
  return <span className="sr-only">Bag{count ? `, ${count} item${count === 1 ? "" : "s"}` : ", empty"}</span>;
}

export function Header({ storeName, logoUrl, nav, signedIn, isAdmin }: { storeName: string; logoUrl?: string | null; nav: Link[]; signedIn: boolean; isAdmin: boolean }) {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMenu(false); setSearch(false); }, [pathname]);
  useEffect(() => { if (search) inputRef.current?.focus(); }, [search]);

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    return path !== "/" && pathname.startsWith(path) && !href.includes("?");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    setSearch(false);
  };

  const wordmark = logoUrl ? (
    <Img src={logoUrl} alt={storeName} width={160} height={40} className="h-8 w-auto object-contain md:h-9" priority />
  ) : (
    <span className="font-display text-[22px] leading-none tracking-[-0.02em] md:text-[26px]">{storeName}</span>
  );

  return (
    <header className="sticky top-0 z-40 bg-bg" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="container-x flex h-16 items-center gap-2 md:h-[72px]">
        <button className="-ml-2 p-2 lg:hidden" aria-label="Open menu" onClick={() => setMenu(true)}>
          <Menu size={24} />
        </button>
        <Link href="/" className="mr-auto flex min-w-0 items-center lg:mr-10" aria-label={`${storeName} home`}>
          {wordmark}
        </Link>
        <nav aria-label="Main" className="hidden flex-1 items-center gap-7 lg:flex">
          {nav.map((l) => (
            <Link key={l.href + l.label} href={l.href} className={cn("text-[15px] font-medium underline-offset-[6px] hover:underline", isActive(l.href) && "underline")}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-0.5 md:gap-1">
          <button className="p-2.5" aria-label={search ? "Close search" : "Search"} aria-expanded={search} onClick={() => setSearch((s) => !s)}>
            {search ? <X size={22} /> : <Search size={22} />}
          </button>
          <Link href="/wishlist" className="hidden p-2.5 sm:block" aria-label="Wishlist">
            <Heart size={22} />
          </Link>
          <Link href={signedIn ? "/account" : "/login"} className="hidden p-2.5 sm:block" aria-label={signedIn ? "My account" : "Sign in"}>
            <User size={22} />
          </Link>
          <Link href="/cart" className="relative -mr-2 p-2.5">
            <ShoppingBag size={22} aria-hidden />
            <BagCount className="right-0.5 top-0.5" />
            <BagLabel />
          </Link>
        </div>
      </div>
      {search && (
        <div className="bg-surface">
          <form role="search" onSubmit={submit} className="container-x flex gap-2 py-3">
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <input id="site-search" ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} className="field flex-1" placeholder="Search scents, gift sets, pillars…" type="search" enterKeyHint="search" autoComplete="off" />
            <button className="btn btn-primary" type="submit">Search</button>
          </form>
        </div>
      )}
      <Sheet open={menu} onClose={() => setMenu(false)} side="left" title={storeName}>
        <nav aria-label="Mobile" className="flex flex-col">
          <Link href="/" className="py-3 text-2xl font-display">Home</Link>
          {nav.map((l) => (
            <Link key={l.href + l.label} href={l.href} className="py-3 font-display text-2xl">{l.label}</Link>
          ))}
        </nav>
        <div className="mt-6 flex flex-col gap-1 bg-surface p-4 text-[16px]" style={{ borderRadius: "var(--radius)" }}>
          <Link href={signedIn ? "/account" : "/login"} className="py-2">{signedIn ? "My account" : "Sign in or create account"}</Link>
          {signedIn && <Link href="/account/orders" className="py-2">My orders</Link>}
          <Link href="/wishlist" className="py-2">Wishlist</Link>
          <Link href="/track" className="py-2">Track an order</Link>
          {isAdmin && <Link href="/admin" className="py-2 font-semibold">Admin dashboard</Link>}
        </div>
      </Sheet>
    </header>
  );
}
