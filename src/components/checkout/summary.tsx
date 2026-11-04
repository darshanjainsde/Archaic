import { formatMoney } from "@/lib/money";
import type { Quote } from "@/lib/orders";

export function SummaryRows({ q, showCod = false }: { q: Quote; showCod?: boolean }) {
  const rows: [string, number, boolean?][] = [["Subtotal", q.subtotal]];
  if (q.memberDiscount > 0) rows.push([`${q.memberTier ?? "Member"} discount (${q.memberPct}%)`, -q.memberDiscount, true]);
  if (q.discount > 0) rows.push([`Code ${q.couponCode}`, -q.discount, true]);
  rows.push(["Shipping", q.shipping]);
  if (q.giftWrap > 0) rows.push(["Gift wrap", q.giftWrap]);
  if (showCod && q.codFee > 0) rows.push(["Cash on Delivery fee", q.codFee]);
  return (
    <dl className="space-y-2 text-[16px]">
      {rows.map(([k, v, neg]) => (
        <div key={k} className="flex justify-between gap-4">
          <dt>{k}</dt>
          <dd className={`tabular-nums ${neg ? "text-sale font-semibold" : ""}`}>{k === "Shipping" && v === 0 ? "Free" : neg ? `− ${formatMoney(-v)}` : formatMoney(v)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 pt-3 text-xl font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatMoney(q.total)}</dd>
      </div>
    </dl>
  );
}

export function FreeShippingBar({ q, threshold }: { q: Quote; threshold: number }) {
  if (threshold <= 0 || q.subtotal === 0) return null;
  const pct = Math.min(100, Math.round(((threshold - q.freeShippingRemaining) / threshold) * 100));
  return (
    <div className="bg-surface p-4" style={{ borderRadius: "var(--radius)" }}>
      <p className="text-[15px]">{q.freeShippingRemaining > 0 ? <>Add <b>{formatMoney(q.freeShippingRemaining)}</b> more for free shipping</> : <>Your order ships free</>}</p>
      <div className="mt-2 h-2 w-full bg-bg" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress to free shipping">
        <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
