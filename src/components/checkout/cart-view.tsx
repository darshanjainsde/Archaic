"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2, Loader2, Gift } from "lucide-react";
import { useCart, cart } from "@/lib/cart-store";
import { Img } from "@/components/ui/img";
import { EmptyState } from "@/components/ui/empty";
import { formatMoney } from "@/lib/money";
import { useQuote } from "./use-quote";
import { SummaryRows, FreeShippingBar } from "./summary";
import { QtyStepper } from "./qty";
import { CouponForm } from "./coupon-form";
import { paperVars } from "./paper";

type Props = { signedIn: boolean; threshold: number; giftWrapEnabled: boolean; giftWrapPrice: number; maxQtyPerLine: number; taxNote: string; membershipName: string | null };

export function CartView(p: Props) {
  const c = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { quote, loading, error } = useQuote(c.lines, c.couponCode, c.giftWrap);

  if (!mounted) return <div className="skeleton h-64 w-full" aria-label="Loading your bag" />;
  if (c.lines.length === 0)
    return <EmptyState title="Your bag is empty" text="Choose a scent you love — every jar can be poured in the colour and label you pick." href="/shop" cta="Browse candles" />;

  const hasErrors = quote?.hasErrors ?? false;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:items-start">
      <section aria-label="Items in your bag">
        <ul className="space-y-4">
          {c.lines.map((line, i) => {
            const q = quote?.lines[i];
            const max = Math.max(1, Math.min(p.maxQtyPerLine, q?.maxQty || p.maxQtyPerLine));
            return (
              <li key={line.key} className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 bg-surface p-4 sm:grid-cols-[112px_minmax(0,1fr)]" style={{ borderRadius: "var(--radius)" }}>
                <Link href={`/product/${line.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-bg">
                  <Img src={q?.image ?? line.image} alt={line.name} fill sizes="112px" className="object-cover" />
                </Link>
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/product/${line.slug}`} className="font-display text-xl leading-tight hover:underline">{line.name}</Link>
                    <span className="shrink-0 font-semibold tabular-nums">{formatMoney(q && !q.error ? q.lineTotal : line.unitPrice * line.quantity)}</span>
                  </div>
                  {line.selectionLabels.length > 0 && (
                    <p className="text-[15px] text-muted">{line.selectionLabels.map((s) => `${s.group}: ${s.value}`).join(" · ")}</p>
                  )}
                  {line.personalization && <p className="text-[15px] text-muted">Label: “{line.personalization}”</p>}
                  {q?.error && (
                    <p className="text-[15px] font-semibold text-sale" role="alert">
                      {q.error}.{" "}
                      {q.maxQty > 0 && q.maxQty < line.quantity ? (
                        <button className="underline" onClick={() => cart.setQty(line.key, q.maxQty, p.maxQtyPerLine)}>Set quantity to {q.maxQty}</button>
                      ) : line.slug ? (
                        <Link className="underline" href={`/product/${line.slug}`}>Choose again</Link>
                      ) : null}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                    <QtyStepper value={line.quantity} max={max} label={line.name} onChange={(n) => cart.setQty(line.key, n, max)} />
                    <button className="inline-flex items-center gap-1.5 p-2 text-[15px] hover:underline" onClick={() => cart.remove(line.key)} aria-label={`Remove ${line.name}`}>
                      <Trash2 size={16} aria-hidden /> Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {p.giftWrapEnabled && (
          <div className="mt-6 bg-surface p-5" style={{ borderRadius: "var(--radius)" }}>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--accent)]" checked={c.giftWrap} onChange={(e) => cart.setGift(e.target.checked)} />
              <span>
                <span className="flex items-center gap-2 font-semibold"><Gift size={18} aria-hidden /> Gift wrap this order</span>
                <span className="block text-[15px] text-muted">Wrapped by hand with a card in your words · {p.giftWrapPrice > 0 ? formatMoney(p.giftWrapPrice) : "free"}{quote && quote.memberPct > 0 ? " (free for members)" : ""}</span>
              </span>
            </label>
            {c.giftWrap && (
              <div className="mt-4">
                <label htmlFor="gift-msg" className="label">Message for the card</label>
                <textarea id="gift-msg" className="field min-h-24" maxLength={200} value={c.giftMessage} onChange={(e) => cart.setGift(true, e.target.value.slice(0, 200))} aria-describedby="gift-msg-hint" placeholder="Happy Diwali! With love…" />
                <p id="gift-msg-hint" className="hint">{200 - c.giftMessage.length} characters left. Prices are not printed on gift orders.</p>
              </div>
            )}
          </div>
        )}
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24" aria-label="Order summary">
        {quote && <FreeShippingBar q={quote} threshold={p.threshold} />}
        <div className="bg-paper p-6 text-paper-ink" style={paperVars}>
          <h2 className="mb-4 flex items-center gap-2 text-3xl">Summary {loading && <Loader2 size={18} className="animate-spin" aria-label="Updating" />}</h2>
          <CouponForm code={c.couponCode} error={quote?.couponError ?? null} applied={Boolean(quote?.couponCode)} onApply={(code) => cart.setCoupon(code)} />
          <div className="mt-5">
            {quote ? <SummaryRows q={quote} /> : <div className="skeleton h-32" />}
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
          {!p.signedIn && p.membershipName && <p className="mt-4 text-[15px]">Members of {p.membershipName} save up to 10%. <Link href="/login?next=/cart" className="underline">Sign in</Link> to see your price.</p>}
          <Link
            href={hasErrors || !quote ? "#" : "/checkout"}
            aria-disabled={hasErrors || !quote}
            onClick={(e) => { if (hasErrors || !quote) e.preventDefault(); }}
            className={`btn mt-6 w-full ${hasErrors || !quote ? "pointer-events-none opacity-50" : ""}`}
            style={{ background: "var(--paper-ink)", color: "var(--paper)" }}
          >
            {hasErrors ? "Fix the items above to continue" : "Checkout"}
          </Link>
          <p className="mt-3 text-center text-[14px] opacity-80">{p.taxNote}</p>
        </div>
        <Link href="/shop" className="block text-center text-[15px] underline">Continue shopping</Link>
      </aside>
    </div>
  );
}
