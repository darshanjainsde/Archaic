"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Gift, Plus, Truck, Check } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { lineKey } from "@/lib/pricing";
import { cart } from "@/lib/cart-store";
import { Img } from "@/components/ui/img";
import { upsellProducts } from "@/actions/upsell";
import { BAG_ADDED_EVENT } from "@/components/store/bag-events";
import type { Quote } from "@/lib/orders";
import type { ProductCardData } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** One progress bar for every milestone: free delivery and each free gift, with the next one spelled out. */
export function RewardsBar({ q, className }: { q: Quote; className?: string }) {
  const ms = q.milestones;
  if (!ms.length || q.subtotal === 0) return null;
  const max = ms[ms.length - 1].threshold;
  const pct = Math.min(100, Math.round((q.progressValue / max) * 100));
  const unlocked = ms.filter((m) => m.reached);
  return (
    <section aria-label="Delivery and gift rewards" className={cn("bg-surface p-4", className)} style={{ borderRadius: "var(--radius)" }}>
      <p className="text-[15px] leading-snug" aria-live="polite">
        {q.next ? (
          <>Add <b className="tabular-nums">{formatMoney(q.next.remaining)}</b> more to get <b>{q.next.label.replace(/^Free /, "free ").replace(/^free delivery$/i, "free delivery")}</b></>
        ) : (
          <><b>You’ve unlocked everything:</b> {unlocked.map((m) => m.label.toLowerCase()).join(" + ")}.</>
        )}
      </p>
      <div className="relative mt-4 mb-8 h-2 bg-bg" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress to your rewards">
        <div className="h-full bg-sale transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        {ms.map((m) => {
          const left = Math.min(100, (m.threshold / max) * 100);
          const Icon = m.kind === "shipping" ? Truck : Gift;
          return (
            <div key={m.kind + m.threshold} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%` }}>
              <span className={cn("grid h-7 w-7 place-items-center rounded-full border-2 transition-colors", m.reached ? "border-sale bg-sale text-paper" : "border-ink/25 bg-bg text-muted")} title={`${m.label} at ${formatMoney(m.threshold)}`}>
                {m.reached ? <Check size={14} aria-hidden /> : <Icon size={14} aria-hidden />}
              </span>
              <span className={cn("absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold tabular-nums", m.reached ? "text-ink" : "text-muted", left > 90 && "left-auto right-0 translate-x-0", left < 10 && "left-0 translate-x-0")}>{formatMoney(m.threshold)}</span>
            </div>
          );
        })}
      </div>
      {q.giftLines.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {q.giftLines.map((g) => (
            <li key={g.key} className="flex items-center gap-3 bg-paper p-2 text-paper-ink" style={{ borderRadius: "var(--radius)" }}>
              <span className="relative h-10 w-10 shrink-0 overflow-hidden bg-surface"><Img src={g.image} alt="" fill sizes="40px" className="object-cover" /></span>
              <span className="min-w-0 flex-1 text-[14px] font-medium">{g.name.replace(" (free gift)", "")}</span>
              <span className="shrink-0 text-[12px] font-bold uppercase tracking-wider text-sale">Free gift</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** "Add one of these" rail. Products without required options add in one tap; others open their page. */
export function UpsellRail({ q, inBag, className, place = "bag" }: { q: Quote; inBag: string[]; className?: string; place?: "bag" | "checkout" }) {
  const [data, setData] = useState<{ heading: string; products: ProductCardData[] } | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const remaining = q.next?.remaining ?? 0;
  const sig = `${remaining}|${inBag.join(",")}`;
  useEffect(() => {
    let alive = true;
    upsellProducts({ remaining, exclude: inBag, place }).then((d) => { if (alive) setData(d); }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  if (!data || !data.products.length) return null;
  const heading = q.next ? (q.next.kind === "shipping" ? data.heading : `Add one of these for ${q.next.label.toLowerCase()}`) : "You may also like";

  function quickAdd(p: ProductCardData) {
    cart.add({ key: lineKey(p.id, [], undefined), productId: p.id, slug: p.slug, name: p.name, image: p.image, unitPrice: p.price, quantity: 1, selections: [], selectionLabels: [] });
    window.dispatchEvent(new Event(BAG_ADDED_EVENT));
    setAdded(p.id);
    setTimeout(() => setAdded((x) => (x === p.id ? null : x)), 1600);
  }

  return (
    <section aria-labelledby="upsell-h" className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="upsell-h" className="text-[22px] leading-tight md:text-[26px]">{heading}</h2>
        {q.next && <span className="shrink-0 text-[13px] text-muted tabular-nums">{formatMoney(q.next.remaining)} to go</span>}
      </div>
      <ul className={cn("no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2", place === "bag" && "md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0")}>
        {data.products.map((p) => {
          const closes = q.next && p.price >= q.next.remaining;
          return (
            <li key={p.id} className={cn("w-[46%] shrink-0 snap-start sm:w-[32%]", place === "bag" ? "md:w-auto" : "md:w-[180px]")}>
              <div className="flex h-full flex-col bg-paper text-paper-ink" style={{ borderRadius: "var(--radius)" }}>
                <Link href={`/product/${p.slug}`} className="relative block aspect-square overflow-hidden bg-surface">
                  <Img src={p.image} alt="" fill sizes="(min-width:768px) 200px, 45vw" className="object-cover" />
                  {closes && <span className="absolute left-2 top-2 bg-sale px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-paper">Unlocks it</span>}
                </Link>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <Link href={`/product/${p.slug}`} className="line-clamp-2 font-display text-[15px] leading-snug">{p.name}</Link>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <span className="text-[15px] font-bold tabular-nums">{formatMoney(p.price)}</span>
                    {p.hasOptions ? (
                      <Link href={`/product/${p.slug}`} className="inline-flex min-h-11 items-center px-3 text-[13px] font-bold underline underline-offset-4">Choose</Link>
                    ) : (
                      <button type="button" onClick={() => quickAdd(p)} className="inline-flex min-h-11 items-center gap-1 bg-paper-ink px-3 text-[13px] font-bold text-paper" aria-label={`Add ${p.name} to bag`}>
                        {added === p.id ? <><Check size={14} aria-hidden /> Added</> : <><Plus size={14} aria-hidden /> Add</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
