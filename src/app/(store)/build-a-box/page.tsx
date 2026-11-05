import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { loadBoxCatalog } from "@/lib/box/catalog";
import { BoxBuilder } from "@/components/store/box/builder";
import "../../box.css";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s.boxes.title,
    description: `${s.boxes.intro} Gift boxes from 3 × 3 to 8 × 8, hand-packed by ${s.store.name}.`,
    alternates: { canonical: "/build-a-box" },
  };
}

export default async function BuildABoxPage() {
  const s = await getSettings();
  const catalog = await loadBoxCatalog(s);
  if (!catalog || !catalog.sizes.length || !catalog.finishes.length || !catalog.ribbons.length || !catalog.fillers.length || !catalog.papers.length) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-[40px]">Custom boxes are resting</h1>
        <p className="mt-3 text-muted">We are not taking custom boxes right now. Our ready gift sets are packed and waiting.</p>
        <Link href="/shop?category=gift-sets" className="btn btn-primary mt-8 inline-flex">See gift sets</Link>
      </div>
    );
  }
  return (
    <div className="container-x pb-16 pt-6 md:pt-10">
      <Suspense>
        <BoxBuilder catalog={catalog} />
      </Suspense>
    </div>
  );
}
