import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { fontVariables } from "./fonts";
import { getSettings } from "@/lib/settings";
import { themeToCss } from "@/lib/theme-css";
import { siteUrl } from "@/lib/utils";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: s.seo.title, template: `%s · ${s.store.name}` },
    description: s.seo.description,
    applicationName: s.store.name,
    appleWebApp: { capable: true, title: s.store.name, statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
    openGraph: { type: "website", siteName: s.store.name, title: s.seo.title, description: s.seo.description, images: s.seo.ogImage ? [s.seo.ogImage] : ["/icons/512"] },
    icons: { icon: [{ url: "/icons/192", type: "image/png" }], apple: [{ url: "/icons/180", sizes: "180x180", type: "image/png" }] },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const s = await getSettings();
  return { themeColor: s.theme.colors.bg, width: "device-width", initialScale: 1, viewportFit: "cover" };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang="en-IN" className={fontVariables} suppressHydrationWarning>
      <head>
        <style id="theme-vars" dangerouslySetInnerHTML={{ __html: themeToCss(s.theme) }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-center" toastOptions={{ style: { background: "var(--paper)", color: "var(--paper-ink)", border: "none", borderRadius: "var(--radius)" } }} />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
