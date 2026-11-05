"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Pages where people read and pay. They get the quiet lattice and paper sheets (see store.css [data-quiet]). */
const QUIET = [/^\/cart/, /^\/checkout/, /^\/account/, /^\/order\//, /^\/track/, /^\/login/, /^\/register/, /^\/forgot-password/, /^\/reset-password/, /^\/wishlist/, /^\/pages\//];

export function QuietRoutes() {
  const pathname = usePathname();
  useEffect(() => {
    const q = QUIET.some((r) => r.test(pathname));
    if (q) document.documentElement.dataset.quiet = "1";
    else delete document.documentElement.dataset.quiet;
  }, [pathname]);
  return null;
}
