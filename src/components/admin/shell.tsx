"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, ShoppingBag, Package, FolderTree, Users, Ticket, Megaphone, Palette, FileText, Star, Settings, ExternalLink, Menu, X, LogOut } from "lucide-react";
import { adminSignOut } from "@/actions/admin/common";
import { cn } from "@/lib/utils";
import { ConfirmProvider } from "./confirm";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, badge: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/banners", label: "Banners & ads", icon: Megaphone },
  { href: "/admin/appearance", label: "Appearance", icon: Palette },
  { href: "/admin/pages", label: "Pages & Our story", icon: FileText },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/** Title for the sticky top bar, from the path. */
function titleFor(path: string): string {
  if (path === "/admin/products/new") return "New product";
  if (/^\/admin\/products\/[^/]+$/.test(path)) return "Edit product";
  if (/^\/admin\/orders\/[^/]+$/.test(path)) return "Order";
  if (/^\/admin\/customers\/[^/]+$/.test(path)) return "Customer";
  const n = [...NAV].reverse().find((x) => (x.exact ? path === x.href : path === x.href || path.startsWith(x.href + "/")));
  return n?.label ?? "Admin";
}

export function AdminShell({ children, userName, storeName, toShip }: { children: React.ReactNode; userName: string; storeName: string; toShip: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [path]);

  // drawer: focus the close button, lock page scroll, close on Escape
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-1 p-3">
      {NAV.map((n) => {
        const active = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
        const Icon = n.icon;
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-12 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors", active ? "bg-ink text-bg" : "text-ink hover:bg-black/5")}>
            <Icon size={20} aria-hidden />
            <span className="flex-1">{n.label}</span>
            {n.badge && toShip > 0 && <span className={cn("min-w-6 rounded-full px-2 text-center text-[13px] font-semibold tabular-nums", active ? "bg-bg text-ink" : "bg-ink text-bg")} aria-label={`${toShip} to ship`}>{toShip}</span>}
          </Link>
        );
      })}
      <a href="/" target="_blank" rel="noreferrer" className="mt-2 flex min-h-12 items-center gap-3 rounded-lg px-3 text-[15px] font-medium hover:bg-black/5">
        <ExternalLink size={20} aria-hidden /> View store
      </a>
    </nav>
  );

  return (
    <ConfirmProvider>
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r border-black/10 bg-surface lg:block">
          <div className="flex h-14 items-center px-6 text-[16px] font-semibold">{storeName}</div>
          {nav}
        </aside>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <div className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-[min(320px,86vw)] flex-col overflow-y-auto overscroll-contain bg-surface pb-[env(safe-area-inset-bottom)] shadow-xl">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/10 pl-4 pr-2">
                <span className="truncate text-[16px] font-semibold">{storeName}</span>
                <button ref={closeRef} type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="icon-btn"><X size={22} aria-hidden /></button>
              </div>
              {nav}
              <div className="mt-auto border-t border-black/10 p-3">
                <p className="truncate px-3 pb-2 text-[14px] text-muted">Signed in as {userName}</p>
                <form action={adminSignOut}>
                  <button className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-medium hover:bg-black/5"><LogOut size={20} aria-hidden />Sign out</button>
                </form>
              </div>
            </div>
          </div>
        )}
        <div className="min-w-0">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-black/10 bg-surface/95 px-2 backdrop-blur md:px-4 lg:px-6">
            <button type="button" className="icon-btn lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={22} aria-hidden /></button>
            <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{titleFor(path)}</span>
            <span className="hidden text-[14px] text-muted md:inline">{userName}</span>
            <form action={adminSignOut} className="hidden sm:block">
              <button className="text-btn"><LogOut size={18} aria-hidden />Sign out</button>
            </form>
          </header>
          <main className="@container mx-auto max-w-[1280px] px-4 py-6 md:px-6 md:py-8">{children}</main>
        </div>
      </div>
    </ConfirmProvider>
  );
}
