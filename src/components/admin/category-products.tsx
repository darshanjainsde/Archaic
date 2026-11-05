"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { assignProductsToCategory } from "@/actions/admin/catalog";
import { Img } from "@/components/ui/img";
import { formatMoney } from "@/lib/money";

export type AssignableProduct = { id: string; name: string; price: number; image: string | null; status: string; categoryId: string | null; categoryName: string | null };

/** Tick the products that belong to this category. Products ticked here move into it; unticked ones leave it. */
export function CategoryProducts({ categoryId, categoryName, products }: { categoryId: string; categoryName: string; products: AssignableProduct[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(() => new Set(products.filter((p) => p.categoryId === categoryId).map((p) => p.id)));
  const initial = useMemo(() => new Set(products.filter((p) => p.categoryId === categoryId).map((p) => p.id)), [products, categoryId]);
  const dirty = sel.size !== initial.size || [...sel].some((id) => !initial.has(id));
  const term = q.trim().toLowerCase();
  const list = useMemo(() => {
    const rows = term ? products.filter((p) => p.name.toLowerCase().includes(term) || (p.categoryName ?? "").toLowerCase().includes(term)) : products;
    // ticked first, then by name
    return [...rows].sort((a, b) => Number(sel.has(b.id)) - Number(sel.has(a.id)) || a.name.localeCompare(b.name));
  }, [products, term, sel]);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const save = () => start(async () => {
    const r = await assignProductsToCategory(categoryId, [...sel]);
    if (r.ok) { toast.success(r.message ?? "Saved"); router.refresh(); } else toast.error(r.error);
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input aria-label="Find a product" className="field !pl-10" placeholder="Find a product…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <span className="text-[14px] text-muted tabular-nums">{sel.size} in {categoryName}</span>
        <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || pending} onClick={save}>{pending ? "Saving…" : "Save products"}</button>
      </div>
      <ul className="max-h-[420px] divide-y divide-black/5 overflow-y-auto rounded-md border border-black/10">
        {list.map((p) => {
          const elsewhere = p.categoryId && p.categoryId !== categoryId ? p.categoryName : null;
          return (
            <li key={p.id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-black/[.03]">
                <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--accent)]" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-field"><Img src={p.image} alt="" fill sizes="36px" className="object-cover" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{p.name}</span>
                  <span className="block text-[13px] text-muted">{formatMoney(p.price)}{p.status !== "ACTIVE" ? ` · ${p.status.toLowerCase()}` : ""}{elsewhere ? ` · now in ${elsewhere}` : ""}</span>
                </span>
              </label>
            </li>
          );
        })}
        {list.length === 0 && <li className="p-4 text-center text-[13px] text-muted">No products match “{q}”.</li>}
      </ul>
      <p className="hint">Ticking a product moves it here, even if it was in another category. Un-ticking leaves it without a category until you place it elsewhere.</p>
    </div>
  );
}
