import Link from "next/link";
import { CornerDownRight, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { Img } from "@/components/ui/img";
import { PageHeader, Panel, Table, Tag, CardList, Card, Toggle } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/action-form";
import { ImageField } from "@/components/admin/image-field";
import { CategoryProducts } from "@/components/admin/category-products";
import { saveCategory, deleteCategory } from "@/actions/admin/catalog";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Categories" };

export default async function Categories({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const sp = await searchParams;
  const [cats, products] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } }),
    db.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, price: true, status: true, categoryId: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } }, category: { select: { name: true } } } }),
  ]);
  const current = sp.edit ? cats.find((c) => c.id === sp.edit) : null;
  const parents = cats.filter((c) => !c.parentId);
  const byParent = new Map<string, typeof cats>();
  for (const c of cats) if (c.parentId) byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
  const rows = parents.flatMap((p) => [{ c: p, depth: 0 }, ...(byParent.get(p.id) ?? []).map((k) => ({ c: k, depth: 1 }))]);
  const orphans = cats.filter((c) => c.parentId && !parents.some((p) => p.id === c.parentId)).map((c) => ({ c, depth: 0 }));
  const all = [...rows, ...orphans];
  const countWithKids = (id: string) => (cats.find((c) => c.id === id)?._count.products ?? 0) + (byParent.get(id) ?? []).reduce((n, k) => n + k._count.products, 0);
  const defaultParent = sp.new && parents.some((p) => p.id === sp.new) ? sp.new : "";
  // phones: the form comes first only while editing or adding a sub-category; otherwise the list does
  const editing = Boolean(current || defaultParent);

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Two levels: a category, and sub-categories inside it. They build the shop filters, the header dropdowns and the homepage tiles."
        actions={<Link href="/admin/categories#category-form" className="btn btn-primary btn-sm"><Plus size={18} aria-hidden />New category</Link>}
      />
      <div className="grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className={`${editing ? "order-2" : "order-1"} @container min-w-0 space-y-6 @4xl:order-1`}>
          <CardList label="Categories">
            {all.map(({ c, depth }) => {
              const kids = byParent.get(c.id)?.length ?? 0;
              return (
                <Card key={c.id} className={depth ? "ml-6" : current?.id === c.id ? "ring-2 ring-ink" : undefined}>
                  <Link href={`/admin/categories?edit=${c.id}#category-form`} className="flex items-center gap-3 p-4">
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-field"><Img src={c.image} alt="" fill sizes="56px" className="object-cover" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-[16px] font-semibold">{depth > 0 && <CornerDownRight size={16} aria-hidden className="shrink-0 text-muted" />}<span className="truncate">{c.name}</span></span>
                      <span className="block text-[14px] text-muted tabular-nums">{depth === 0 && kids ? `${countWithKids(c.id)} products · ${kids} sub-categor${kids === 1 ? "y" : "ies"}` : `${c._count.products} product${c._count.products === 1 ? "" : "s"}`}</span>
                      <span className="mt-2 flex flex-wrap gap-2">{c.isVisible ? <Tag tone="green">Visible</Tag> : <Tag>Hidden</Tag>}{c.showInMenu ? <Tag tone="green">In menu</Tag> : <Tag>Not in menu</Tag>}</span>
                    </span>
                  </Link>
                  <div className="flex flex-wrap gap-1 border-t border-black/5 px-2 py-1">
                    <Link className="text-btn" href={`/admin/categories?edit=${c.id}#category-form`}><Pencil size={18} aria-hidden />Edit</Link>
                    {depth === 0 && <Link className="text-btn" href={`/admin/categories?new=${c.id}#category-form`}><Plus size={18} aria-hidden />Sub-category</Link>}
                    <ConfirmButton className="text-btn is-danger ml-auto" danger confirmLabel="Delete category" confirmTitle={`Delete ${c.name}?`} confirmText={`Its ${c._count.products} products stay in the store without a category${kids ? `, and its ${kids} sub-categories become top-level` : ""}.`} action={deleteCategory.bind(null, c.id)}><Trash2 size={18} aria-hidden />Delete</ConfirmButton>
                  </div>
                </Card>
              );
            })}
            {all.length === 0 && <li className="rounded-xl border border-dashed border-black/15 p-8 text-center text-muted">No categories yet. Create the first one with the form below.</li>}
          </CardList>
          <Table hideOnPhone>
            <thead><tr><th className="w-14"><span className="sr-only">Photo</span></th><th>Name</th><th>Products</th><th>Menu</th><th>Visible</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {all.map(({ c, depth }) => (
                <tr key={c.id} className={current?.id === c.id ? "bg-black/[.03]" : undefined}>
                  <td><div className="relative h-10 w-10 overflow-hidden rounded-md bg-field"><Img src={c.image} alt="" fill sizes="40px" className="object-cover" /></div></td>
                  <td>
                    <div className={depth ? "flex items-center gap-1.5 pl-5 text-muted" : "flex items-center gap-1.5"}>
                      {depth > 0 && <CornerDownRight size={14} aria-hidden />}
                      <b className={depth ? "font-medium text-ink" : undefined}>{c.name}</b>
                    </div>
                    <div className={`text-[13px] text-muted ${depth ? "pl-5" : ""}`}>/shop?category={c.slug}</div>
                  </td>
                  <td className="tabular-nums">{depth === 0 && byParent.get(c.id)?.length ? <>{countWithKids(c.id)} <span className="text-muted">({c._count.products} direct)</span></> : c._count.products}</td>
                  <td>{c.showInMenu ? <Tag tone="green">In menu</Tag> : <Tag>Hidden</Tag>}</td>
                  <td>{c.isVisible ? <Tag tone="green">Visible</Tag> : <Tag>Hidden</Tag>}</td>
                  <td className="whitespace-nowrap text-right">
                    {depth === 0 && <Link className="text-btn" href={`/admin/categories?new=${c.id}#category-form`}>+ Sub</Link>}
                    <Link className="text-btn" href={`/admin/categories?edit=${c.id}#category-form`}>Edit</Link>
                    <ConfirmButton className="text-btn is-danger" danger confirmLabel="Delete category" confirmTitle={`Delete ${c.name}?`} confirmText={`Its ${c._count.products} products stay in the store without a category${byParent.get(c.id)?.length ? `, and its ${byParent.get(c.id)!.length} sub-categories become top-level` : ""}.`} action={deleteCategory.bind(null, c.id)}>Delete</ConfirmButton>
                  </td>
                </tr>
              ))}
              {all.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted">No categories yet. Create the first one with the form.</td></tr>}
            </tbody>
          </Table>

          {current && (
            <Panel title={`Products in ${current.name}`} description="Tick the products that belong here. Search by name; ticked products stay at the top.">
              <CategoryProducts
                categoryId={current.id}
                categoryName={current.name}
                products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, status: p.status, image: p.images[0]?.url ?? null, categoryId: p.categoryId, categoryName: p.category?.name ?? null }))}
              />
            </Panel>
          )}
        </div>

        <Panel id="category-form" title={current ? `Edit ${current.name}` : defaultParent ? `New sub-category of ${parents.find((p) => p.id === defaultParent)?.name}` : "New category"} className={`${editing ? "order-1" : "order-2"} @4xl:order-2 @4xl:self-start`} actions={current && <Link href="/admin/categories" className="text-btn -mr-3 -mt-3">Cancel</Link>}>
          <ActionForm key={current?.id ?? `new-${defaultParent}`} action={saveCategory} className="space-y-4" resetOnSuccess={!current}>
            <input type="hidden" name="id" value={current?.id ?? ""} />
            <div><label className="label" htmlFor="c-name">Name</label><input id="c-name" name="name" className="field" autoComplete="off" defaultValue={current?.name} required placeholder="e.g. Diwali gifts" /></div>
            <div>
              <label className="label" htmlFor="c-parent">Inside</label>
              <select id="c-parent" name="parentId" className="field" defaultValue={current?.parentId ?? defaultParent}>
                <option value="">None: a top-level category</option>
                {parents.filter((p) => p.id !== current?.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <p className="hint">Top-level categories show in the menu bar and on the homepage. Pick one here to make this a sub-category of it.</p>
            </div>
            <div><label className="label" htmlFor="c-slug">Web address</label><input id="c-slug" name="slug" className="field" autoComplete="off" spellCheck={false} defaultValue={current?.slug} placeholder="made from the name" /><p className="hint">Used in links like /shop?category=diwali-gifts. Leave empty to make it from the name.</p></div>
            <div><label className="label" htmlFor="c-desc">Description</label><textarea id="c-desc" name="description" rows={3} className="field" defaultValue={current?.description ?? ""} placeholder="One or two lines. Shown on the category page and used by Google." /></div>
            <ImageField label="Image" name="image" value={current?.image} hint="Square works best. Shown in the header dropdown, the homepage tiles and the category page." />
            <div><label className="label" htmlFor="c-sort">Position</label><input id="c-sort" name="sortOrder" type="number" inputMode="numeric" min={0} className="field" defaultValue={current?.sortOrder ?? cats.length + 1} /><p className="hint">Lower numbers come first.</p></div>
            <div>
              <Toggle name="showInMenu" label="Show in header dropdowns" defaultChecked={current?.showInMenu ?? true} />
              <Toggle name="isVisible" label="Visible in store" hint="Off hides the category page and its tile." defaultChecked={current?.isVisible ?? true} />
            </div>
            <SubmitButton className="w-full" pendingText="Saving…">{current ? "Save category" : "Create category"}</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
