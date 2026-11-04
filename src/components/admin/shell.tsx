"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, ShoppingBag, Package, FolderTree, Users, Ticket, Megaphone, Palette, FileText, Star, Settings, ExternalLink, Menu, X, LogOut } from "lucide-react";
import { adminSignOut } from "@/actions/admin/common";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, badge: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/banners", label: "Banners & ads", icon: Megaphone },
  { href: "/admin/appearance", label: "Appearance", icon: Palette },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ children, userName, storeName, toShip }: { children: React.ReactNode; userName: string; storeName: string; toShip: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-0.5 p-3">
      {NAV.map((n) => {
        const active = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
        const Icon = n.icon;
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium transition-colors", active ? "bg-ink text-bg" : "text-ink hover:bg-black/5")}>
            <Icon size={17} aria-hidden />
            <span className="flex-1">{n.label}</span>
            {n.badge && toShip > 0 && <span className={cn("rounded px-1.5 text-[12px] font-semibold tabular-nums", active ? "bg-bg text-ink" : "bg-ink text-bg")}>{toShip}</span>}
          </Link>
        );
      })}
      <a href="/" target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium hover:bg-black/5">
        <ExternalLink size={17} aria-hidden /> View store
      </a>
    </nav>
  );

  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r border-black/10 bg-surface lg:block">
        <div className="px-6 pb-2 pt-5 text-[15px] font-semibold">{storeName}</div>
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-surface">
            <div className="flex items-center justify-between px-6 pt-4">
              <span className="text-[15px] font-semibold">{storeName}</span>
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-2"><X size={20} /></button>
            </div>
            {nav}
          </div>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-black/10 bg-surface/95 px-4 md:px-6">
          <button className="-ml-2 p-2 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <span className="text-[14px] font-semibold lg:hidden">Admin</span>
          <div className="flex-1" />
          <span className="hidden text-[14px] text-muted sm:inline">{userName}</span>
          <form action={adminSignOut}>
            <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[14px] hover:bg-black/5"><LogOut size={16} aria-hidden />Sign out</button>
          </form>
        </header>
        <main className="mx-auto max-w-[1280px] px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
