import Link from "next/link";
import type { Prisma, ProductStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { Img } from "@/components/ui/img";
import { ChevronRight } from "lucide-react";
import { PageHeader, Table, Tag, Pagination, Empty, CardList, Card } from "@/components/admin/ui";
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
      <form className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_200px_auto]">
        <input name="q" defaultValue={q} type="search" placeholder="Search name, SKU or tag…" aria-label="Search products" autoComplete="off" className="field sm:col-span-2 lg:col-span-1" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="field">
          <option value="">Active & drafts</option><option value="ACTIVE">Active</option><option value="DRAFT">Drafts</option><option value="ARCHIVED">Archived</option>
        </select>
        <select name="category" defaultValue={category ?? ""} aria-label="Category" className="field">
          <option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="none">No category</option>
        </select>
        <button className="btn btn-ink sm:col-span-2 lg:col-span-1">Filter</button>
      </form>
      {products.length === 0 ? <Empty>No products match. <Link href="/admin/products/new" className="underline underline-offset-4">Add one</Link>.</Empty> : (
        <>
          <CardList label="Products">
            {products.map((p) => (
              <Card key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 p-4">
                  <span className="relative h-[72px] w-14 shrink-0 overflow-hidden rounded-lg bg-field"><Img src={p.images[0]?.url} alt="" fill sizes="56px" className="object-cover" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold leading-6">{p.name}</span>
                    <span className="block truncate text-[14px] text-muted">{p.category?.name ?? "No category"}{p.sku ? ` · ${p.sku}` : ""}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
                      <b className="tabular-nums">{formatMoney(p.price)}</b>
                      <span className="tabular-nums">{p.trackInventory ? <span className={p.stock <= s.commerce.lowStockThreshold ? "font-semibold text-sale" : ""}>{p.stock} in stock</span> : <span className="text-muted">Made to order</span>}</span>
                      <Tag tone={p.status === "ACTIVE" ? "green" : p.status === "DRAFT" ? "amber" : "neutral"}>{p.status === "ACTIVE" ? "Active" : p.status === "DRAFT" ? "Draft" : "Archived"}</Tag>
                    </span>
                  </span>
                  <ChevronRight size={20} aria-hidden className="shrink-0 text-muted" />
                </Link>
                <ProductRowActions id={p.id} status={p.status} name={p.name} className="justify-start border-t border-black/5 px-2 py-1" />
              </Card>
            ))}
          </CardList>
          <Table hideOnPhone>
            <thead><tr><th className="w-14"><span className="sr-only">Photo</span></th><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td><div className="relative h-12 w-10 overflow-hidden rounded-md bg-field"><Img src={p.images[0]?.url} alt="" fill sizes="40px" className="object-cover" /></div></td>
                  <td>
                    <Link href={`/admin/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
                    <div className="text-[13px] text-muted">{p.category?.name ?? "No category"}{p.sku ? ` · ${p.sku}` : ""}{p.featured ? " · Featured" : ""}</div>
                  </td>
                  <td className="whitespace-nowrap tabular-nums">{formatMoney(p.price)}{p.compareAtPrice ? <s className="ml-1 text-[13px] text-muted">{formatMoney(p.compareAtPrice)}</s> : null}</td>
                  <td className="tabular-nums">{p.trackInventory ? <span className={p.stock <= s.commerce.lowStockThreshold ? "font-semibold text-sale" : ""}>{p.stock}</span> : <span className="text-muted">Not tracked</span>}</td>
                  <td><Tag tone={p.status === "ACTIVE" ? "green" : p.status === "DRAFT" ? "amber" : "neutral"}>{p.status === "ACTIVE" ? "Active" : p.status === "DRAFT" ? "Draft" : "Archived"}</Tag></td>
                  <td><ProductRowActions id={p.id} status={p.status} name={p.name} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
      <Pagination page={page} pages={pages} makeHref={href} />
    </div>
  );
}
