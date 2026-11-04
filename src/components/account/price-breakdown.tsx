import { formatMoney } from "@/lib/money";

type O = { subtotal: number; memberDiscount: number; memberTier: string | null; discount: number; couponCode: string | null; shipping: number; giftWrap: number; codFee: number; total: number };

export function PriceBreakdown({ o }: { o: O }) {
  const rows: [string, number, boolean?][] = [["Subtotal", o.subtotal]];
  if (o.memberDiscount) rows.push([`${o.memberTier ?? "Member"} discount`, o.memberDiscount, true]);
  if (o.discount) rows.push([`Code ${o.couponCode ?? ""}`, o.discount, true]);
  rows.push(["Shipping", o.shipping]);
  if (o.giftWrap) rows.push(["Gift wrap", o.giftWrap]);
  if (o.codFee) rows.push(["Cash on Delivery fee", o.codFee]);
  return (
    <dl className="space-y-2 text-[16px]">
      {rows.map(([k, v, neg]) => (
        <div key={k} className="flex justify-between gap-4"><dt>{k}</dt><dd className={`tabular-nums ${neg ? "font-semibold text-sale" : ""}`}>{neg ? `− ${formatMoney(v)}` : k === "Shipping" && v === 0 ? "Free" : formatMoney(v)}</dd></div>
      ))}
      <div className="flex justify-between gap-4 pt-2 text-xl font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(o.total)}</dd></div>
    </dl>
  );
}
