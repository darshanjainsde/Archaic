import type { Metadata } from "next";
import { ShopView, categoryMetadata } from "@/components/store/shop-view";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  return categoryMetadata(decodeURIComponent(slug), sp);
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  return <ShopView sp={sp} categorySlug={decodeURIComponent(slug)} />;
}
