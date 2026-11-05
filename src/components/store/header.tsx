"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { Sheet } from "@/components/ui/sheet";
import { Img } from "@/components/ui/img";
import { cn } from "@/lib/utils";
import { BAG_ADDED_EVENT } from "./bag-events";
import type { NavLink } from "@/lib/settings-schema";
import { ArchaicLogo } from "./logo";

export { BAG_ADDED_EVENT };

/** Serialisable slice of the category tree the header needs (see src/lib/categories.ts). */
export type MenuCat = { slug: string; name: string; image: string | null; count: number; showInMenu: boolean; children: MenuCat[] };

export function BagCount({ className }: { className?: string }) {
  const { count } = useCart();
  const [bump, setBump] = useState(0);
  useEffect(() => {
    const on = () => setBump((n) => n + 1);
    window.addEventListener(BAG_ADDED_EVENT, on);
    return () => window.removeEventListener(BAG_ADDED_EVENT, on);
  }, []);
  if (!count) return null;
  return (
    <span key={bump} className={cn("absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-accent-ink tabular-nums", bump > 0 && "bag-bump", className)} aria-hidden>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function BagLabel() {
  const { count } = useCart();
  return <span className="sr-only">Bag{count ? `, ${count} item${count === 1 ? "" : "s"}` : ", empty"}</span>;
}

const catHref = (slug: string) => `/shop?category=${slug}`;

/** Which categories a nav item drops down to. `null` = plain link. */
function menuFor(link: NavLink, tree: MenuCat[]): { title: string; href: string; items: MenuCat[] } | null {
  const visible = (list: MenuCat[]) => list.filter((c) => c.showInMenu);
  if (link.menu === "all") return visible(tree).length ? { title: "Shop all", href: "/shop", items: visible(tree) } : null;
  if (link.menu === "category") {
    const cat = tree.find((c) => c.slug === link.categorySlug) ?? tree.flatMap((c) => c.children).find((c) => c.slug === link.categorySlug);
    if (!cat) return null;
    const kids = visible(cat.children);
    return { title: `All ${cat.name.toLowerCase()}`, href: catHref(cat.slug), items: kids.length ? kids : visible(tree) };
  }
  return null;
}

/* ---------------- Desktop dropdown panel ---------------- */
function MegaPanel({ menu, onPick }: { menu: NonNullable<ReturnType<typeof menuFor>>; onPick: () => void }) {
  const cols = Math.min(5, Math.max(2, menu.items.length));
  return (
    <div className="container-x py-7">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <Link href={menu.href} onClick={onPick} className="font-display text-[22px] underline-offset-[6px] hover:underline">{menu.title} →</Link>
        <span className="text-[13px] text-muted">{menu.items.reduce((n, c) => n + c.count, 0)} products</span>
      </div>
      <ul className="grid gap-5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {menu.items.map((c) => (
          <li key={c.slug} className="min-w-0">
            <Link href={catHref(c.slug)} onClick={onPick} className="group block">
              <span className="relative block aspect-[4/3] overflow-hidden bg-surface" style={{ borderRadius: "var(--radius)" }}>
                <Img src={c.image} alt="" fill sizes="220px" className="object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.04]" />
              </span>
              <span className="mt-2.5 flex items-baseline justify-between gap-2">
                <span className="truncate font-display text-[18px] leading-tight underline-offset-4 group-hover:underline">{c.name}</span>
                <span className="shrink-0 text-[13px] text-muted">{c.count}</span>
              </span>
            </Link>
            {c.children.filter((k) => k.showInMenu).length > 0 && (
              <ul className="mt-2 flex flex-col gap-0.5">
                {c.children.filter((k) => k.showInMenu).map((k) => (
                  <li key={k.slug}><Link href={catHref(k.slug)} onClick={onPick} className="block py-1 text-[14px] text-muted underline-offset-4 hover:text-ink hover:underline">{k.name}</Link></li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NavItem({ link, menu, open, setOpen, isActive }: { link: NavLink; menu: ReturnType<typeof menuFor>; open: boolean; setOpen: (v: boolean) => void; isActive: boolean }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const later = (fn: () => void, ms: number) => { clear(); timer.current = setTimeout(fn, ms); };
  useEffect(() => clear, []);
  if (!menu) {
    return <Link href={link.href} className={cn("inline-flex h-12 items-center whitespace-nowrap text-[15px] font-medium underline-offset-[6px] hover:underline", isActive && "underline")}>{link.label}</Link>;
  }
  return (
    <div
      className="static"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") later(() => setOpen(true), 90); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") later(() => setOpen(false), 160); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}
    >
      <div className="flex items-center">
        <Link href={link.href} onFocus={() => setOpen(true)} className={cn("inline-flex h-12 items-center whitespace-nowrap text-[15px] font-medium underline-offset-[6px] hover:underline", (isActive || open) && "underline")}>{link.label}</Link>
        <button
          type="button"
          className="-mr-2 grid h-12 w-8 place-items-center text-muted hover:text-ink"
          aria-expanded={open}
          aria-label={`${open ? "Close" : "Open"} ${link.label} menu`}
          onClick={() => setOpen(!open)}
        >
          <ChevronDown size={16} className={cn("transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
        </button>
      </div>
      <div
        className={cn(
          "absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-160px)] overflow-y-auto border-b border-ink/10 bg-bg shadow-[0_24px_40px_-24px_rgba(0,0,0,.35)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
        {...(!open ? { inert: true } : {})}
      >
        <MegaPanel menu={menu} onPick={() => setOpen(false)} />
      </div>
    </div>
  );
}

/* ---------------- Mobile accordion ---------------- */
function MobileItem({ link, menu }: { link: NavLink; menu: ReturnType<typeof menuFor> }) {
  const [open, setOpen] = useState(false);
  if (!menu) return <Link href={link.href} className="flex min-h-14 items-center border-b border-ink/10 font-display text-[22px]">{link.label}</Link>;
  const id = `m-${link.label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="border-b border-ink/10">
      <div className="flex items-center">
        <Link href={link.href} className="flex min-h-14 flex-1 items-center font-display text-[22px]">{link.label}</Link>
        <button type="button" className="-mr-3 grid h-12 w-12 place-items-center" aria-expanded={open} aria-controls={id} aria-label={`${open ? "Hide" : "Show"} ${link.label} categories`} onClick={() => setOpen((v) => !v)}>
          <ChevronDown size={22} className={cn("transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
        </button>
      </div>
      <div id={id} hidden={!open} className="pb-3">
        <Link href={menu.href} className="flex min-h-11 items-center text-[16px] font-semibold underline underline-offset-4">{menu.title}</Link>
        <ul className="mt-1 flex flex-col">
          {menu.items.map((c) => (
            <li key={c.slug}>
              <Link href={catHref(c.slug)} className="flex min-h-12 items-center gap-3 py-1.5">
                <span className="relative h-11 w-11 shrink-0 overflow-hidden bg-surface" style={{ borderRadius: "var(--radius)" }}><Img src={c.image} alt="" fill sizes="44px" className="object-cover" /></span>
                <span className="min-w-0 flex-1 truncate text-[17px]">{c.name}</span>
                <span className="text-[13px] text-muted">{c.count}</span>
              </Link>
              {c.children.filter((k) => k.showInMenu).length > 0 && (
                <ul className="ml-14 flex flex-col">
                  {c.children.filter((k) => k.showInMenu).map((k) => (
                    <li key={k.slug}><Link href={catHref(k.slug)} className="flex min-h-11 items-center text-[15px] text-muted">{k.name}</Link></li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Header ---------------- */
export function Header({ storeName, logoUrl, nav, tree, signedIn, isAdmin }: { storeName: string; logoUrl?: string | null; nav: NavLink[]; tree: MenuCat[]; signedIn: boolean; isAdmin: boolean }) {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => { setMenu(false); setSearch(false); setOpenIdx(null); }, [pathname]);
  useEffect(() => { if (search) inputRef.current?.focus(); }, [search]);
  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenIdx(null); };
    const onDown = (e: PointerEvent) => { if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpenIdx(null); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [openIdx]);

  const isActive = useCallback((href: string) => {
    const path = href.split("?")[0];
    return path !== "/" && pathname.startsWith(path) && !href.includes("?");
  }, [pathname]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    setSearch(false);
  };

  const wordmark = (h: string) => logoUrl ? (
    <Img src={logoUrl} alt={storeName} width={200} height={52} className={cn("w-auto object-contain", h)} priority />
  ) : (
    <ArchaicLogo className={cn("brand-logo block w-auto", h)} title={storeName} />
  );
  const split = Math.ceil(nav.length / 2);
  const navItem = (l: NavLink, i: number) => (
    <NavItem key={l.href + l.label} link={l} menu={menuFor(l, tree)} open={openIdx === i} setOpen={(v) => setOpenIdx(v ? i : null)} isActive={isActive(l.href)} />
  );

  return (
    <header ref={headerRef} className="site-header sticky top-0 z-40" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="container-x hdr-row">
        <div className="flex min-w-0 items-center">
          <button className="-ml-2.5 grid h-11 w-11 shrink-0 place-items-center lg:hidden" aria-label="Open menu" onClick={() => setMenu(true)}>
            <Menu size={24} />
          </button>
          <nav aria-label="Main" className="hidden min-w-0 items-center gap-6 lg:flex">
            {nav.slice(0, split).map((l, i) => navItem(l, i))}
          </nav>
        </div>
        <Link href="/" className="flex items-center justify-center self-stretch" aria-label={`${storeName} home`}>
          {wordmark("hdr-logo")}
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-4 xl:gap-6">
          {nav.length > split && (
            <nav aria-label="More" className="hidden min-w-0 items-center gap-4 lg:flex xl:gap-6">
              {nav.slice(split).map((l, i) => navItem(l, i + split))}
            </nav>
          )}
          <div className="flex shrink-0 items-center">
            <button className="grid h-11 w-11 place-items-center" aria-label={search ? "Close search" : "Search"} aria-expanded={search} onClick={() => setSearch((s) => !s)}>
              {search ? <X size={22} /> : <Search size={22} />}
            </button>
            <Link href="/wishlist" className="hidden h-11 w-11 place-items-center sm:grid" aria-label="Wishlist">
              <Heart size={22} />
            </Link>
            <Link href={signedIn ? "/account" : "/login"} className="hidden h-11 w-11 place-items-center xl:grid" aria-label={signedIn ? "My account" : "Sign in"}>
              <User size={22} />
            </Link>
            <Link href="/cart" className="relative -mr-2.5 grid h-11 w-11 place-items-center">
              <ShoppingBag size={22} aria-hidden />
              <BagCount className="right-0 top-0.5" />
              <BagLabel />
            </Link>
          </div>
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
      <Sheet open={menu} onClose={() => setMenu(false)} side="left" title={storeName} head={<Link href="/" aria-label={`${storeName} home`}>{wordmark("h-10")}</Link>}>
        <nav aria-label="Mobile" className="flex flex-col">
          <Link href="/" className="flex min-h-14 items-center border-b border-ink/10 font-display text-[22px]">Home</Link>
          {nav.map((l) => <MobileItem key={l.href + l.label} link={l} menu={menuFor(l, tree)} />)}
        </nav>
        <div className="mt-6 flex flex-col bg-surface px-4 py-2 text-[16px]" style={{ borderRadius: "var(--radius)" }}>
          <Link href={signedIn ? "/account" : "/login"} className="flex min-h-12 items-center">{signedIn ? "My account" : "Sign in or create account"}</Link>
          {signedIn && <Link href="/account/orders" className="flex min-h-12 items-center">My orders</Link>}
          <Link href="/wishlist" className="flex min-h-12 items-center">Wishlist</Link>
          <Link href="/track" className="flex min-h-12 items-center">Track an order</Link>
          {isAdmin && <Link href="/admin" className="flex min-h-12 items-center font-semibold">Admin dashboard</Link>}
        </div>
      </Sheet>
    </header>
  );
}
