import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { AdminShell } from "@/components/admin/shell";
import "./admin.css";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ADMIN_VARS = {
  "--bg": "#f6f5f2",
  "--surface": "#ffffff",
  "--ink": "#1d1b18",
  "--muted": "#625d55",
  "--accent": "#2b2216",
  "--accent-ink": "#ffffff",
  "--field": "#ece9e3",
  "--field-ink": "#1d1b18",
  "--paper": "#ffffff",
  "--paper-ink": "#1d1b18",
  "--sale": "#b3261e",
  "--radius": "8px",
  "--btn-radius": "8px",
  "--font-body": "var(--font-inter)",
  "--font-display": "var(--font-inter)",
  "--heading-weight": "600",
} as React.CSSProperties;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const [toShip, settings] = await Promise.all([db.order.count({ where: { status: { in: ["CONFIRMED", "PROCESSING"] } } }), getSettings()]);
  return (
    <div style={{ ...ADMIN_VARS, fontFamily: "var(--font-inter), system-ui, sans-serif" }} className="admin-root min-h-dvh bg-bg text-ink [&_h1]:tracking-tight [&_h2]:tracking-tight [&_h1]:leading-tight [&_h2]:leading-tight">
      <AdminShell userName={user.name} storeName={settings.store.name} toShip={toShip}>
        {children}
      </AdminShell>
    </div>
  );
}
