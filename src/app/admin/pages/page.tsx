import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageHeader, Panel, Table, Tag, CardList, Card, Toggle } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/action-form";
import { MarkdownField } from "@/components/admin/markdown-field";
import { savePage, deletePage } from "@/actions/admin/catalog";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Pages" };

export default async function Pages({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const pages = await db.page.findMany({ orderBy: { title: "asc" } });
  // ?edit=<id> or ?edit=<slug> (e.g. ?edit=about from the homepage Story section)
  const p = edit && edit !== "new" ? pages.find((x) => x.id === edit || x.slug === edit) : null;
  const showForm = edit === "new" || !!p;
  const about = pages.find((x) => x.slug === "about");
  return (
    <div>
      <PageHeader
        title="Pages"
        description="Our story (About), policies and other text pages. Published pages with “Show in footer” on are linked at the bottom of every store page."
        actions={!showForm && <Link href="/admin/pages?edit=new#page-form" className="btn btn-primary btn-sm">New page</Link>}
      />
      {!showForm && about && (
        <Link href={`/admin/pages?edit=${about.id}#page-form`} className="mb-6 flex min-h-11 items-center gap-3 rounded-xl border border-black/10 bg-surface p-4 hover:border-black/25">
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold">Edit “Our story”</span>
            <span className="block text-[14px] text-muted">The About page at /pages/about: your story, photos and how you work.</span>
          </span>
          <ChevronRight size={20} aria-hidden />
        </Link>
      )}
      {showForm && (
        <Panel id="page-form" title={p ? `Edit “${p.title}”` : "New page"} className="mb-6" actions={<Link href="/admin/pages" className="text-btn -mr-3 -mt-3">Close</Link>}>
          <ActionForm key={p?.id ?? "new"} action={savePage} className="space-y-4">
            <input type="hidden" name="id" value={p?.id ?? ""} />
            <div className="grid gap-4 @md:grid-cols-2">
              <div>
                <label className="label" htmlFor="pt">Title</label>
                <input id="pt" name="title" className="field" defaultValue={p?.title} required placeholder="e.g. Our story" autoComplete="off" />
              </div>
              <div>
                <label className="label" htmlFor="ps">Web address</label>
                <div className="flex items-center rounded-lg border border-black/[.18] bg-white focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
                  <span className="shrink-0 pl-3 text-[16px] text-muted">/pages/</span>
                  <input id="ps" name="slug" className="min-h-12 w-full min-w-0 bg-transparent py-3 pr-3 text-[16px] outline-none" defaultValue={p?.slug} placeholder="made from the title" autoComplete="off" spellCheck={false} aria-describedby="ps-hint" />
                </div>
                <p id="ps-hint" className="hint">Leave empty to make it from the title. Changing it breaks old links.</p>
              </div>
            </div>
            <MarkdownField name="content" label="Page text" defaultValue={p?.content ?? ""} rows={16} />
            <div className="grid gap-x-6 @md:grid-cols-2">
              <Toggle name="isPublished" label="Published" hint="Off = hidden from customers (a draft)." defaultChecked={p?.isPublished ?? true} />
              <Toggle name="showInFooter" label="Show in footer" hint="Adds a link at the bottom of every page." defaultChecked={p?.showInFooter ?? true} />
            </div>
            <div className="flex flex-col gap-3 border-t border-black/10 pt-4 sm:flex-row sm:flex-wrap">
              <SubmitButton pendingText="Saving…" className="w-full sm:w-auto">Save page</SubmitButton>
              {p && <a className="btn btn-ghost w-full sm:w-auto" href={`/pages/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={18} aria-hidden />View in store</a>}
              {p && <ConfirmButton className="btn btn-ghost w-full text-sale sm:ml-auto sm:w-auto" confirmTitle={`Delete “${p.title}”?`} confirmText="The page and its link in the footer are removed. This cannot be undone." confirmLabel="Delete page" danger action={deletePage.bind(null, p.id)}>Delete page</ConfirmButton>}
            </div>
          </ActionForm>
        </Panel>
      )}

      <CardList label="Pages">
        {pages.map((x) => (
          <Card key={x.id}>
            <Link href={`/admin/pages?edit=${x.id}#page-form`} className="flex min-h-11 items-center gap-3 p-4">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-semibold">{x.title}</span>
                <span className="block truncate text-[14px] text-muted">/pages/{x.slug} · {formatDate(x.updatedAt)}</span>
                <span className="mt-2 flex flex-wrap gap-2">{x.isPublished ? <Tag tone="green">Published</Tag> : <Tag>Draft</Tag>}{x.showInFooter && <Tag>In footer</Tag>}</span>
              </span>
              <ChevronRight size={20} aria-hidden className="shrink-0 text-muted" />
            </Link>
          </Card>
        ))}
      </CardList>
      <Table hideOnPhone>
        <thead><tr><th>Title</th><th>Web address</th><th>Status</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {pages.map((x) => (
            <tr key={x.id}>
              <td><Link className="font-semibold hover:underline" href={`/admin/pages?edit=${x.id}#page-form`}>{x.title}</Link></td>
              <td className="text-muted">/pages/{x.slug}</td>
              <td><span className="flex flex-wrap gap-2">{x.isPublished ? <Tag tone="green">Published</Tag> : <Tag>Draft</Tag>}{x.showInFooter && <Tag>In footer</Tag>}</span></td>
              <td className="whitespace-nowrap">{formatDate(x.updatedAt)}</td>
              <td className="text-right"><Link className="text-btn" href={`/admin/pages?edit=${x.id}#page-form`}>Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
