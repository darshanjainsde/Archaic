"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Trash2, Loader2, Gift } from "lucide-react";
import { useCart, cart } from "@/lib/cart-store";
import { Img } from "@/components/ui/img";
import { EmptyState } from "@/components/ui/empty";
import { formatMoney } from "@/lib/money";
import { useQuote } from "./use-quote";
import { SummaryRows } from "./summary";
import { RewardsBar, UpsellRail } from "./rewards";
import { QtyStepper } from "./qty";
import { CouponForm } from "./coupon-form";
import { paperVars } from "./paper";

type Props = { signedIn: boolean; threshold: number; giftWrapEnabled: boolean; giftWrapPrice: number; maxQtyPerLine: number; taxNote: string; membershipName: string | null };

export function CartView(p: Props) {
  const c = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { quote, loading, error } = useQuote(c.lines, c.couponCode, c.giftWrap);
  // Phones: keep the total and Checkout in reach until the summary's own button scrolls into view.
  const checkoutRef = useRef<HTMLAnchorElement>(null);
  const [dock, setDock] = useState(false);
  const hasLines = c.lines.length > 0;
  useEffect(() => {
    const el = checkoutRef.current;
    if (!mounted || !hasLines || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setDock(!e.isIntersecting && e.boundingClientRect.top > 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [mounted, hasLines]);

  if (!mounted) return <div className="skeleton h-64 w-full" aria-label="Loading your bag" />;
  if (c.lines.length === 0)
    return <EmptyState title="Your bag is empty" text="Choose a scent you love — every jar can be poured in the colour and label you pick." href="/shop" cta="Browse candles" />;

  const hasErrors = quote?.hasErrors ?? false;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <section aria-label="Items in your bag" className="min-w-0">
        <ul className="space-y-4">
          {c.lines.map((line, i) => {
            const q = quote?.lines[i];
            const max = Math.max(1, Math.min(p.maxQtyPerLine, q?.maxQty || p.maxQtyPerLine));
            const href = line.box ? `/build-a-box?edit=${encodeURIComponent(line.key)}` : `/product/${line.slug}`;
            return (
              <li key={line.key} className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 bg-surface p-4 sm:grid-cols-[112px_minmax(0,1fr)]" style={{ borderRadius: "var(--radius)" }}>
                <Link href={href} className="relative block aspect-[4/5] overflow-hidden bg-bg">
                  <Img src={q?.image || line.image} alt={line.name} fill sizes="112px" className={line.box ? "object-contain p-1" : "object-cover"} />
                </Link>
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={href} className="-my-2 py-2 font-display text-xl leading-tight hover:underline">{line.name}</Link>
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
                      ) : line.box ? (
                        <Link className="underline" href={href}>Open the box</Link>
                      ) : line.slug ? (
                        <Link className="underline" href={`/product/${line.slug}`}>Choose again</Link>
                      ) : null}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1">
                    <QtyStepper value={line.quantity} max={max} label={line.name} onChange={(n) => cart.setQty(line.key, n, max)} />
                    {line.box && <Link href={href} className="inline-flex min-h-11 items-center px-2 text-[15px] font-semibold underline underline-offset-4">Edit box</Link>}
                    <button className="-mr-2 ml-auto inline-flex min-h-11 items-center gap-1.5 px-2 text-[15px] hover:underline" onClick={() => cart.remove(line.key)} aria-label={`Remove ${line.name}`}>
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
        {quote && <UpsellRail q={quote} inBag={c.lines.map((l) => l.productId)} className="mt-12" />}
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24" aria-label="Order summary">
        {quote && <RewardsBar q={quote} />}
        <div className="bg-paper p-6 text-paper-ink" style={paperVars}>
          <h2 className="mb-4 flex items-center gap-2 text-3xl">Summary {loading && <Loader2 size={18} className="animate-spin" aria-label="Updating" />}</h2>
          <CouponForm code={c.couponCode} error={quote?.couponError ?? null} applied={Boolean(quote?.couponCode)} onApply={(code) => cart.setCoupon(code)} />
          <div className="mt-5">
            {quote ? <SummaryRows q={quote} /> : <div className="skeleton h-32" />}
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
          {!p.signedIn && p.membershipName && <p className="mt-4 text-[15px]">Members of {p.membershipName} save up to 10%. <Link href="/login?next=/cart" className="underline">Sign in</Link> to see your price.</p>}
          <Link
            ref={checkoutRef}
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
        <Link href="/shop" className="tap-y w-full justify-center text-[15px] underline">Continue shopping</Link>
      </aside>

      <div
        className={`dock-bar fixed inset-x-0 z-30 bg-paper px-4 py-3 text-paper-ink shadow-[0_-8px_24px_rgb(0_0_0/0.18)] lg:hidden ${dock ? "visible translate-y-0" : "invisible translate-y-[200%]"}`}
        style={{ ...paperVars, borderRadius: 0, bottom: "calc(64px + var(--safe-bottom))" }}
        aria-hidden={!dock}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] opacity-80">{c.count} item{c.count === 1 ? "" : "s"}</p>
            <p className="text-[18px] font-semibold tabular-nums">{formatMoney(quote ? quote.total : c.estimate)}</p>
          </div>
          <Link
            href={hasErrors || !quote ? "#" : "/checkout"}
            tabIndex={dock ? 0 : -1}
            aria-disabled={hasErrors || !quote}
            onClick={(e) => { if (hasErrors || !quote) e.preventDefault(); }}
            className={`btn shrink-0 ${hasErrors || !quote ? "pointer-events-none opacity-50" : ""}`}
            style={{ background: "var(--paper-ink)", color: "var(--paper)" }}
          >
            {hasErrors ? "Fix items" : "Checkout"}
          </Link>
        </div>
      </div>
    </div>
  );
}
