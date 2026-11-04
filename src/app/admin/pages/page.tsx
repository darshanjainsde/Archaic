import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageHeader, Panel, Table, Tag } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/action-form";
import { MarkdownField } from "@/components/admin/markdown-field";
import { savePage, deletePage } from "@/actions/admin/catalog";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Pages" };

export default async function Pages({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const pages = await db.page.findMany({ orderBy: { title: "asc" } });
  const p = edit && edit !== "new" ? pages.find((x) => x.id === edit) : null;
  const showForm = edit === "new" || !!p;
  return (
    <div>
      <PageHeader title="Pages" description="About, policies and other content pages. Published pages marked “footer” are linked in the store footer." actions={<Link href="/admin/pages?edit=new" className="btn btn-primary btn-sm">New page</Link>} />
      {showForm && (
        <Panel title={p ? `Edit “${p.title}”` : "New page"} className="mb-6" actions={<Link href="/admin/pages" className="text-[13px] underline">Close</Link>}>
          <ActionForm key={p?.id ?? "new"} action={savePage} className="space-y-4">
            <input type="hidden" name="id" value={p?.id ?? ""} />
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="label" htmlFor="pt">Title</label><input id="pt" name="title" className="field" defaultValue={p?.title} required /></div>
              <div><label className="label" htmlFor="ps">URL</label><div className="flex items-center gap-1 text-[14px]"><span className="text-muted">/pages/</span><input id="ps" name="slug" className="field" defaultValue={p?.slug} placeholder="auto from title" /></div></div>
            </div>
            <MarkdownField name="content" label="Content" defaultValue={p?.content ?? ""} />
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="isPublished" defaultChecked={p?.isPublished ?? true} className="h-5 w-5 accent-[var(--accent)]" /> Published</label>
              <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="showInFooter" defaultChecked={p?.showInFooter ?? true} className="h-5 w-5 accent-[var(--accent)]" /> Show in footer</label>
            </div>
            <div className="flex gap-2">
              <SubmitButton pendingText="Saving…">Save page</SubmitButton>
              {p && <a className="btn btn-ghost" href={`/pages/${p.slug}`} target="_blank" rel="noreferrer">View</a>}
              {p && <ConfirmButton className="btn btn-ghost text-sale" confirmText={`Delete “${p.title}”?`} action={deletePage.bind(null, p.id)}>Delete</ConfirmButton>}
            </div>
          </ActionForm>
        </Panel>
      )}
      <Table>
        <thead><tr><th>Title</th><th>URL</th><th>Status</th><th>Updated</th><th></th></tr></thead>
        <tbody>
          {pages.map((x) => (
            <tr key={x.id}>
              <td><b>{x.title}</b></td>
              <td className="text-muted">/pages/{x.slug}</td>
              <td className="space-x-1">{x.isPublished ? <Tag tone="green">Published</Tag> : <Tag>Draft</Tag>}{x.showInFooter && <Tag>Footer</Tag>}</td>
              <td className="whitespace-nowrap">{formatDate(x.updatedAt)}</td>
              <td className="text-right text-[13px]"><Link className="rounded px-2 py-1 hover:bg-black/5" href={`/admin/pages?edit=${x.id}`}>Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
