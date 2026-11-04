import Link from "next/link";
import type { Prisma, ProductStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { Img } from "@/components/ui/img";
import { PageHeader, Table, Tag, Pagination, Empty } from "@/components/admin/ui";
import { ProductRowActions } from "@/components/admin/product-row-actions";

export const metadata = { title: "Products" };
const PER = 25;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = ["DRAFT", "ACTIVE", "ARCHIVED"].includes(sp.status ?? "") ? (sp.status as ProductStatus) : undefined;
  const category = sp.category || undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(status ? { status } : { status: { not: "ARCHIVED" } }),
    ...(category ? { categoryId: category === "none" ? null : category } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }, { tags: { has: q.toLowerCase() } }] } : {}),
  };
  const [products, total, cats, s] = await Promise.all([
    db.product.findMany({ where, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], skip: (page - 1) * PER, take: PER, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: { select: { name: true } } } }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    getSettings(),
  ]);
  const pages = Math.ceil(total / PER);
  const href = (p: number) => `/admin/products?${new URLSearchParams({ ...(q && { q }), ...(sp.status && { status: sp.status }), ...(category && { category }), page: String(p) })}`;

  return (
    <div>
      <PageHeader title="Products" description={`${total} product${total === 1 ? "" : "s"}`} actions={<Link href="/admin/products/new" className="btn btn-primary btn-sm">Add product</Link>} />
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_160px_200px_auto]">
        <input name="q" defaultValue={q} placeholder="Search name, SKU or tag" aria-label="Search products" className="field !min-h-[40px] !py-2" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="field !min-h-[40px] !py-2">
          <option value="">Active & drafts</option><option value="ACTIVE">Active</option><option value="DRAFT">Drafts</option><option value="ARCHIVED">Archived</option>
        </select>
        <select name="category" defaultValue={category ?? ""} aria-label="Category" className="field !min-h-[40px] !py-2">
          <option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="none">No category</option>
        </select>
        <button className="btn btn-ink btn-sm !min-h-[40px]">Filter</button>
      </form>
      {products.length === 0 ? <Empty>No products match. <Link href="/admin/products/new" className="underline">Add one</Link>.</Empty> : (
        <Table>
          <thead><tr><th className="w-14"></th><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><div className="relative h-12 w-10 overflow-hidden rounded bg-field"><Img src={p.images[0]?.url} alt="" fill sizes="40px" className="object-cover" /></div></td>
                <td>
                  <Link href={`/admin/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
                  <div className="text-[12px] text-muted">{p.category?.name ?? "No category"}{p.sku ? ` · ${p.sku}` : ""}{p.featured ? " · Featured" : ""}</div>
                </td>
                <td className="whitespace-nowrap tabular-nums">{formatMoney(p.price)}{p.compareAtPrice ? <s className="ml-1 text-[12px] text-muted">{formatMoney(p.compareAtPrice)}</s> : null}</td>
                <td className="tabular-nums">{p.trackInventory ? <span className={p.stock <= s.commerce.lowStockThreshold ? "font-semibold text-sale" : ""}>{p.stock}</span> : <span className="text-muted">Not tracked</span>}</td>
                <td><Tag tone={p.status === "ACTIVE" ? "green" : p.status === "DRAFT" ? "amber" : "neutral"}>{p.status === "ACTIVE" ? "Active" : p.status === "DRAFT" ? "Draft" : "Archived"}</Tag></td>
                <td><ProductRowActions id={p.id} status={p.status} name={p.name} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pages={pages} makeHref={href} />
    </div>
  );
}
