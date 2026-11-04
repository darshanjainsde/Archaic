import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

type Params = Promise<{ slug: string }>;
const getPage = cache((slug: string) => db.page.findUnique({ where: { slug: slug.slice(0, 120) } }));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page || !page.isPublished) return { title: "Page not found", robots: { index: false } };
  return { title: page.title, description: page.content.replace(/[#*_\[\]()]/g, "").slice(0, 160), alternates: { canonical: `/pages/${page.slug}` } };
}

export default async function CmsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page || !page.isPublished) notFound();
  return (
    <article className="container-x grid gap-8 pt-8 md:grid-cols-12 md:pt-16">
      <header className="md:col-span-4">
        <h1 className="text-[44px] md:text-[64px]">{page.title}</h1>
        <p className="mt-4 text-[15px] text-muted">Updated {formatDate(page.updatedAt)}</p>
      </header>
      <div className="label-panel p-6 md:col-span-7 md:col-start-6 md:p-12">
        <div className="prose-store" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />
      </div>
    </article>
  );
}
