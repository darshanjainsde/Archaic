import "../store.css";
import { getSettings } from "@/lib/settings";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { AnnouncementBar } from "@/components/store/announcement";
import { Header } from "@/components/store/header";
import { TabBar } from "@/components/store/tabbar";
import { Footer } from "@/components/store/footer";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { getCategoryTree } from "@/lib/categories";
import { Scene } from "@/components/store/scene";
import { QuietRoutes } from "@/components/store/quiet-routes";

/** Footer pages change rarely; cached so store pages can be served from the CDN. */
const footerPages = unstable_cache(
  () => db.page.findMany({ where: { isPublished: true, showInFooter: true }, select: { slug: true, title: true }, orderBy: { title: "asc" } }).catch(() => []),
  ["footer-pages-v1"],
  { tags: ["pages"], revalidate: 600 },
);

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, pages, tree] = await Promise.all([getSettings(), footerPages(), getCategoryTree()]);
  const menuTree = tree.map((c) => ({
    slug: c.slug, name: c.name, image: c.image, count: c.count, showInMenu: c.showInMenu,
    children: c.children.filter((k) => k.count > 0).map((k) => ({ slug: k.slug, name: k.name, image: k.image, count: k.count, showInMenu: k.showInMenu, children: [] })),
  }));
  return (
    <div className="mobile-tabbar-space flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:bg-paper focus:p-3 focus:text-paper-ink">Skip to content</a>
      <QuietRoutes />
      {settings.theme.motion === "honeycomb" && <Scene />}
      {settings.announcement.enabled && <AnnouncementBar messages={settings.announcement.messages} href={settings.announcement.href || undefined} />}
      <Header storeName={settings.store.name} logoUrl={settings.store.logoUrl} nav={settings.nav} tree={menuTree} />
      <main id="main" className="flex-1">{children}</main>
      <Footer settings={settings} pages={pages} />
      <TabBar />
      <InstallPrompt storeName={settings.store.name} />
    </div>
  );
}
