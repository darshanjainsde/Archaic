import Link from "next/link";
import { db } from "@/lib/db";
import { Img } from "@/components/ui/img";
import { PageHeader, Panel, Table, Tag } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/action-form";
import { ImageField } from "@/components/admin/image-field";
import { saveCategory, deleteCategory } from "@/actions/admin/catalog";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Categories" };

export default async function Categories({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const cats = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  const current = edit ? cats.find((c) => c.id === edit) : null;
  return (
    <div>
      <PageHeader title="Categories" description="Group products in the shop filters and homepage." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="order-2 lg:order-1">
          <Table>
            <thead><tr><th className="w-14"></th><th>Name</th><th>Products</th><th>Order</th><th>Visible</th><th></th></tr></thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id}>
                  <td><div className="relative h-10 w-10 overflow-hidden rounded bg-field"><Img src={c.image} alt="" fill sizes="40px" className="object-cover" /></div></td>
                  <td><b>{c.name}</b><div className="text-[12px] text-muted">/shop?category={c.slug}</div></td>
                  <td className="tabular-nums">{c._count.products}</td>
                  <td className="tabular-nums">{c.sortOrder}</td>
                  <td>{c.isVisible ? <Tag tone="green">Visible</Tag> : <Tag>Hidden</Tag>}</td>
                  <td className="text-right text-[13px]">
                    <Link className="rounded px-2 py-1 hover:bg-black/5" href={`/admin/categories?edit=${c.id}`}>Edit</Link>
                    <ConfirmButton className="rounded px-2 py-1 text-sale hover:bg-red-50" confirmText={`Delete ${c.name}? Its ${c._count.products} products keep existing without a category.`} action={deleteCategory.bind(null, c.id)}>Delete</ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <Panel title={current ? `Edit ${current.name}` : "New category"} className="order-1 lg:order-2 lg:self-start" actions={current && <Link href="/admin/categories" className="text-[13px] underline">New instead</Link>}>
          <ActionForm key={current?.id ?? "new"} action={saveCategory} className="space-y-4" resetOnSuccess={!current}>
            <input type="hidden" name="id" value={current?.id ?? ""} />
            <div><label className="label" htmlFor="c-name">Name</label><input id="c-name" name="name" className="field" defaultValue={current?.name} required /></div>
            <div><label className="label" htmlFor="c-slug">URL slug</label><input id="c-slug" name="slug" className="field" defaultValue={current?.slug} placeholder="auto from name" /></div>
            <div><label className="label" htmlFor="c-desc">Description</label><textarea id="c-desc" name="description" rows={3} className="field" defaultValue={current?.description ?? ""} /></div>
            <ImageField label="Image" name="image" value={current?.image} />
            <div><label className="label" htmlFor="c-sort">Sort order</label><input id="c-sort" name="sortOrder" type="number" min={0} className="field" defaultValue={current?.sortOrder ?? cats.length + 1} /></div>
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="isVisible" defaultChecked={current?.isVisible ?? true} className="h-5 w-5 accent-[var(--accent)]" /> Visible in store</label>
            <SubmitButton className="w-full" pendingText="Saving…">{current ? "Save category" : "Create category"}</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
