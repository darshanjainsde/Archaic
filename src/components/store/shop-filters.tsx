"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Cat = { slug: string; name: string; count: number; /** true for a sub-category (indented under its parent) */ sub?: boolean };

export const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "new", label: "Newest" },
  { value: "bestsellers", label: "Bestsellers" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

function useQueryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const push = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    const qs = next.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { params, push, pending };
}

export function SortSelect() {
  const { params, push } = useQueryNav();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="hidden text-[15px] sm:block">Sort</label>
      <select id="sort" className="field !min-h-11 !py-2 text-[15px]" value={params.get("sort") ?? "featured"} onChange={(e) => push({ sort: e.target.value === "featured" ? null : e.target.value })}>
        {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
  );
}

function FilterBody({ categories, onDone }: { categories: Cat[]; onDone?: () => void }) {
  const { params, push, pending } = useQueryNav();
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  useEffect(() => { setMin(params.get("min") ?? ""); setMax(params.get("max") ?? ""); }, [params]);
  const active = params.get("category");
  const inStock = params.get("inStock") === "1";
  const applyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = (v: string) => (v && /^\d+$/.test(v.trim()) ? v.trim() : null);
    push({ min: clean(min), max: clean(max) });
    onDone?.();
  };
  return (
    <div className={cn("flex flex-col gap-8 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      <fieldset>
        <legend className="mb-3 font-display text-[22px]">Category</legend>
        <ul className="flex flex-col gap-1 text-[16px]">
          <li>
            <button type="button" onClick={() => { push({ category: null }); onDone?.(); }} className={cn("w-full py-2.5 text-left hover:underline underline-offset-4", !active && "font-bold underline")} aria-pressed={!active}>All products</button>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <button type="button" onClick={() => { push({ category: c.slug }); onDone?.(); }} className={cn("flex min-h-11 w-full items-center justify-between text-left hover:underline underline-offset-4", c.sub && "pl-4 text-[15px]", active === c.slug && "font-bold underline")} aria-pressed={active === c.slug}>
                <span>{c.name}</span><span className="text-muted">{c.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
      <form onSubmit={applyPrice}>
        <fieldset>
          <legend className="mb-3 font-display text-[22px]">Price (₹)</legend>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="min-price">Minimum price</label>
            <input id="min-price" inputMode="numeric" pattern="[0-9]*" className="field" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} />
            <span aria-hidden>–</span>
            <label className="sr-only" htmlFor="max-price">Maximum price</label>
            <input id="max-price" inputMode="numeric" pattern="[0-9]*" className="field" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} />
          </div>
          <button type="submit" className="btn btn-ghost mt-3 w-full">Apply price</button>
        </fieldset>
      </form>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[16px]">
        <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={inStock} onChange={(e) => { push({ inStock: e.target.checked ? "1" : null }); }} />
        In stock only
      </label>
      {(active || params.get("min") || params.get("max") || inStock || params.get("q")) && (
        <Link href="/shop" className="text-[15px] font-semibold underline underline-offset-4" onClick={() => onDone?.()}>Clear all filters</Link>
      )}
    </div>
  );
}

export function ShopFilters({ categories }: { categories: Cat[] }) {
  return <FilterBody categories={categories} />;
}

export function MobileFilterButton({ categories, activeCount }: { categories: Cat[]; activeCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm !min-h-11 lg:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontal size={16} aria-hidden /> Filters{activeCount ? ` (${activeCount})` : ""}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} side="bottom" title="Filters">
        <FilterBody categories={categories} onDone={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
