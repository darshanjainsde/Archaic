"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { Img } from "@/components/ui/img";
import { Stars } from "@/components/ui/stars";
import { WishlistButton } from "@/components/store/wishlist-button";
import { BAG_ADDED_EVENT } from "@/components/store/bag-events";
import { cart, express } from "@/lib/cart-store";
import { lineKey, resolveLine } from "@/lib/pricing";
import { discountPercent, formatMoney } from "@/lib/money";
import type { OptionGroup, Personalization, Selection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { defaultSelections } from "@/lib/quick-add";

export type ProductViewData = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  badge: string | null;
  price: number;
  compareAtPrice: number | null;
  images: { url: string; alt: string | null }[];
  options: OptionGroup[];
  personalization: Personalization | null;
  stock: number;
  trackInventory: boolean;
  maxQtyPerLine: number;
  category: { name: string; slug: string } | null;
  rating: { avg: number; count: number };
  isDraft: boolean;
};

/** A small candle tinted by the value's colour; the flame shows (and flickers) only on the chosen one. */
function CandleIcon({ hex }: { hex: string | null | undefined }) {
  return (
    <svg viewBox="0 0 38 46" aria-hidden>
      <path className="fl" d="M19 12 c-5 7 2 9 0 13 c-2-4 5-6 0-13z" fill="#ffb347" />
      <rect x="18" y="20" width="2" height="6" fill="currentColor" opacity=".7" />
      <rect x="8" y="26" width="22" height="18" rx="3" fill={hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : "var(--accent)"} stroke="currentColor" strokeOpacity=".25" />
      <rect x="11" y="32" width="16" height="7" fill="var(--paper)" stroke="currentColor" strokeOpacity=".2" strokeWidth=".6" />
    </svg>
  );
}

export function ProductView({ p, wishlisted, deliveryText, children }: { p: ProductViewData; wishlisted?: boolean; deliveryText: string; children?: React.ReactNode }) {
  const router = useRouter();
  const [sel, setSel] = useState<Record<string, string>>(() => defaultSelections(p.options));
  const [lit, setLit] = useState(false);
  const [text, setText] = useState("");
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  useEffect(() => {
    if (zoom === null) return;
    const n = gallery.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
      if (e.key === "ArrowRight") setZoom((z) => (z === null ? z : (z + 1) % n));
      if (e.key === "ArrowLeft") setZoom((z) => (z === null ? z : (z - 1 + n) % n));
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);
  const [showError, setShowError] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [added, setAdded] = useState(0);
  const ctaRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLit(false); }, [sel]);
  const selections: Selection[] = useMemo(() => Object.entries(sel).map(([groupId, valueId]) => ({ groupId, valueId })), [sel]);
  const res = resolveLine(p.price, p.options, selections, p.personalization, text);
  const unit = res.ok ? res.unitPrice : p.price;
  const delta = unit - p.price;
  const compare = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice + delta : null;
  const off = discountPercent(unit, compare);

  const maxQty = Math.max(0, p.trackInventory ? Math.min(p.stock, p.maxQtyPerLine) : p.maxQtyPerLine);
  const soldOut = p.trackInventory && p.stock <= 0;

  // Gallery follows the chosen option's picture
  const optionImage = res.ok ? res.optionImage : null;
  const gallery = useMemo(() => {
    const imgs = p.images.length ? p.images : [{ url: "/images/placeholder.svg", alt: p.name }];
    if (optionImage && !imgs.some((i) => i.url === optionImage)) return [{ url: optionImage, alt: p.name }, ...imgs];
    return imgs;
  }, [p.images, p.name, optionImage]);

  useEffect(() => {
    if (!optionImage) return;
    const idx = gallery.findIndex((g) => g.url === optionImage);
    if (idx >= 0) goTo(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionImage]);

  function goTo(i: number) {
    setActive(i);
    const rail = railRef.current;
    if (rail) rail.scrollTo({ left: rail.clientWidth * i, behavior: "smooth" });
  }

  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setBarVisible(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // "Added" confirmation on the button for a moment after each add
  const [justAdded, setJustAdded] = useState(false);
  useEffect(() => {
    if (!added) return;
    setJustAdded(true);
    const t = setTimeout(() => setJustAdded(false), 2000);
    return () => clearTimeout(t);
  }, [added]);

  useEffect(() => { if (qty > maxQty && maxQty > 0) setQty(maxQty); }, [maxQty, qty]);

  function add(buyNow: boolean) {
    if (soldOut) return;
    if (!res.ok) {
      setShowError(true);
      toast.error(res.error);
      return;
    }
    const key = lineKey(p.id, selections, res.personalization);
    if (buyNow) {
      // Buy now checks out only this product, with the chosen options and quantity. The bag is left as it is.
      express.set({ key, productId: p.id, slug: p.slug, name: p.name, image: res.optionImage ?? p.images[0]?.url ?? null, unitPrice: unit, quantity: Math.min(qty, maxQty || qty), selections, selectionLabels: res.snapshot, personalization: res.personalization ?? undefined });
      router.push("/checkout?buy=1");
      return;
    }
    const existing = cart.get().lines.find((l) => l.key === key)?.quantity ?? 0;
    if (existing >= maxQty) {
      toast(`You already have the maximum (${maxQty}) of this in your bag`, { action: { label: "View bag", onClick: () => router.push("/cart") } });
      if (buyNow) router.push("/checkout");
      return;
    }
    cart.add(
      { key, productId: p.id, slug: p.slug, name: p.name, image: res.optionImage ?? p.images[0]?.url ?? null, unitPrice: unit, quantity: qty, selections, selectionLabels: res.snapshot, personalization: res.personalization ?? undefined },
      maxQty,
    );
    window.dispatchEvent(new Event(BAG_ADDED_EVENT));
    if (buyNow) { router.push("/checkout"); return; }
    setAdded((n) => n + 1);
    setLit(true);
    toast.success(`${p.name} added to your bag`, { action: { label: "View bag", onClick: () => router.push("/cart") } });
  }

  const onRailScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    const i = Math.round(rail.scrollLeft / Math.max(1, rail.clientWidth));
    if (i !== active) setActive(i);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      {/* Gallery: thumbnails on the left (desktop) or below (phone); the frame is square, capped to the screen
          height, and shows the whole product (contain), never a crop. Tap to view full screen. */}
      <div className="min-w-0 lg:col-span-6">
        <div className="lg:sticky lg:top-24 md:grid md:grid-cols-[76px_minmax(0,1fr)] md:items-start md:gap-4 lg:gap-5">
          <div className="relative -mx-4 min-w-0 md:order-2 md:mx-0">
            <div ref={railRef} onScroll={onRailScroll} className="pv-frame snap-row no-scrollbar auto-cols-[100%] bg-surface md:overflow-hidden" style={{ borderRadius: "var(--radius)" }} aria-label="Product images" role="region">
              {gallery.map((g, i) => (
                <button key={g.url + i} type="button" onClick={() => setZoom(i)} aria-label={`View image ${i + 1} full screen`} className="relative block aspect-[4/5] w-full cursor-zoom-in" data-lit={lit && i === active ? "" : undefined}>
                  <Img src={g.url} alt={g.alt || `${p.name}, image ${i + 1}`} fill priority={i === 0} sizes="(min-width:1024px) 680px, 100vw" className="lit-img object-contain" />
                  {i === active && <span className="lit-layer" aria-hidden />}
                </button>
              ))}
            </div>
            {gallery.length > 1 && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2 md:hidden" aria-hidden>
                {gallery.map((_, i) => <span key={i} className={cn("h-2 w-2 rounded-full transition-colors", i === active ? "bg-ink" : "bg-ink/35")} />)}
              </div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="pv-thumbs no-scrollbar mt-3 hidden gap-3 md:order-1 md:mt-0 md:flex md:flex-col" aria-label="Choose an image">
              {gallery.map((g, i) => (
                <button key={g.url + i} type="button" onClick={() => goTo(i)} aria-label={`Show image ${i + 1}`} aria-current={i === active} className={cn("relative aspect-square w-[76px] shrink-0 overflow-hidden bg-surface transition-opacity", i === active ? "outline-2 outline-offset-2 outline-ink" : "opacity-60 hover:opacity-100")} style={{ borderRadius: "calc(var(--radius) * .6)", outlineStyle: i === active ? "solid" : undefined }}>
                  <Img src={g.url} alt="" fill sizes="76px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {zoom !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/90 p-4" role="dialog" aria-modal="true" aria-label={`${p.name}, image ${zoom + 1} of ${gallery.length}`} onClick={() => setZoom(null)}>
          <div className="relative h-full max-h-[min(92svh,1100px)] w-full max-w-[min(92vw,1100px)]">
            <Img src={gallery[zoom].url} alt={gallery[zoom].alt || p.name} fill sizes="92vw" className="object-contain" />
          </div>
          <button type="button" autoFocus onClick={() => setZoom(null)} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-paper text-paper-ink" aria-label="Close"><X className="h-5 w-5" /></button>
          {gallery.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); setZoom((zoom - 1 + gallery.length) % gallery.length); }} className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper text-paper-ink" aria-label="Previous image"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setZoom((zoom + 1) % gallery.length); }} className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper text-paper-ink" aria-label="Next image"><ChevronRight className="h-5 w-5" /></button>
            </>
          )}
        </div>
      )}

      {/* Buy panel */}
      <div className="lg:col-span-6">
        <div className="lg:sticky lg:top-24">
          {p.isDraft && <p className="mb-3 bg-sale/20 p-3 text-[14px] font-semibold">Draft preview — only admins can see this page.</p>}
          {p.category && <a href={`/shop?category=${p.category.slug}`} className="text-[15px] text-muted hover:underline underline-offset-4">{p.category.name}</a>}
          <h1 className="mt-2 text-[38px] md:text-[52px]">{p.name}</h1>
          {p.rating.count > 0 && (
            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-[15px] hover:underline underline-offset-4">
              <Stars value={p.rating.avg} /> {p.rating.avg.toFixed(1)} · {p.rating.count} review{p.rating.count === 1 ? "" : "s"}
            </a>
          )}
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[28px] font-semibold tabular-nums" aria-live="polite">{formatMoney(unit)}</span>
            {compare && <s className="text-[17px] tabular-nums text-muted">{formatMoney(compare)}</s>}
            {off > 0 && <span className="text-[16px] font-semibold text-sale">{off}% off</span>}
          </div>
          <p className="text-[14px] text-muted">Inclusive of all taxes</p>
          {p.shortDescription && <p className="mt-5 text-[17px]">{p.shortDescription}</p>}

          <div className="mt-8 flex flex-col gap-7">
            {p.options.map((g) => {
              const chosen = g.values.find((v) => v.id === sel[g.id]);
              const missing = showError && g.required && !chosen;
              return (
                <fieldset key={g.id}>
                  <legend className="mb-3 text-[16px]">
                    <span className="font-semibold">{g.name}</span>
                    {chosen && <span className="text-muted">: {chosen.label}</span>}
                    {missing && <span className="ml-2 text-sale">Please choose one</span>}
                  </legend>
                  {g.display === "dropdown" ? (
                    <select className="field" aria-label={g.name} value={sel[g.id] ?? ""} onChange={(e) => setSel((s) => { const n = { ...s }; if (e.target.value) n[g.id] = e.target.value; else delete n[g.id]; return n; })}>
                      {!g.required && <option value="">None</option>}
                      {g.values.map((v) => (
                        <option key={v.id} value={v.id} disabled={!v.available}>
                          {v.label}{v.priceDelta ? ` (+${formatMoney(v.priceDelta)})` : ""}{!v.available ? " — unavailable" : ""}
                        </option>
                      ))}
                    </select>
                  ) : g.display === "candle" ? (
                    <div role="radiogroup" aria-label={g.name} className="candle-opts">
                      {g.values.map((v) => {
                        const checked = sel[g.id] === v.id;
                        const toggle = () => setSel((s) => { const n = { ...s }; if (checked && !g.required) delete n[g.id]; else n[g.id] = v.id; return n; });
                        const second = v.note || (v.priceDelta ? `+${formatMoney(v.priceDelta)}` : null);
                        return (
                          <button key={v.id} type="button" role="radio" aria-checked={checked} aria-label={`${v.label}${v.priceDelta ? `, plus ${formatMoney(v.priceDelta)}` : ""}${!v.available ? ", unavailable" : ""}`} disabled={!v.available} onClick={toggle} className="candle-opt">
                            <CandleIcon hex={v.hex} />
                            <span className="t">{v.label}</span>
                            {second && <span className="n">{second}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div role="radiogroup" aria-label={g.name} className={cn("flex flex-wrap", g.display === "swatch" ? "gap-3" : "gap-2")}>
                      {g.values.map((v) => {
                        const checked = sel[g.id] === v.id;
                        const toggle = () => setSel((s) => { const n = { ...s }; if (checked && !g.required) delete n[g.id]; else n[g.id] = v.id; return n; });
                        const label = `${v.label}${v.priceDelta ? `, plus ${formatMoney(v.priceDelta)}` : ""}${!v.available ? ", unavailable" : ""}`;
                        return g.display === "swatch" && v.hex ? (
                          <button key={v.id} type="button" role="radio" aria-checked={checked} aria-label={label} title={v.label} disabled={!v.available} onClick={toggle} className="swatch" style={{ background: v.hex }} />
                        ) : (
                          <button key={v.id} type="button" role="radio" aria-checked={checked} aria-label={label} disabled={!v.available} onClick={toggle} className="opt-btn">
                            {v.label}{v.priceDelta ? <span className="ml-1.5 opacity-75">+{formatMoney(v.priceDelta)}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </fieldset>
              );
            })}

            {p.personalization && (
              <div>
                <label htmlFor="personal" className="label">
                  {p.personalization.label}
                  {!p.personalization.required && <span className="font-normal text-muted"> (optional)</span>}
                  {p.personalization.price > 0 && <span className="font-normal text-muted"> · +{formatMoney(p.personalization.price)}</span>}
                </label>
                <input id="personal" className="field" maxLength={p.personalization.maxLength} value={text} onChange={(e) => setText(e.target.value)} aria-describedby="personal-hint" aria-invalid={showError && p.personalization.required && !text.trim() ? true : undefined} placeholder="Written by hand on the label" />
                <p id="personal-hint" className="hint flex justify-between"><span>We write it exactly as you type it.</span><span className="tabular-nums">{text.length}/{p.personalization.maxLength}</span></p>
              </div>
            )}
          </div>

          <div ref={ctaRef} className="mt-8">
            {soldOut ? (
              <div className="bg-surface p-5" style={{ borderRadius: "var(--radius)" }}>
                <p className="font-display text-[22px]">Sold out for now</p>
                <p className="mt-1 text-[16px]">We pour in small batches. Save it to your wishlist and check back soon.</p>
                <WishlistButton productId={p.id} initial={wishlisted} withLabel className="btn btn-ghost mt-4" />
              </div>
            ) : (
              <>
                <div className="flex items-stretch gap-3">
                  <div className="flex items-center bg-surface" style={{ borderRadius: "var(--btn-radius)" }}>
                    <button type="button" className="flex h-12 w-11 items-center justify-center disabled:opacity-35" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={16} /></button>
                    <span className="w-8 text-center text-[16px] font-semibold tabular-nums" aria-live="polite" aria-label={`Quantity ${qty}`}>{qty}</span>
                    <button type="button" className="flex h-12 w-11 items-center justify-center disabled:opacity-35" aria-label="Increase quantity" disabled={qty >= maxQty} onClick={() => setQty((q) => Math.min(maxQty, q + 1))}><Plus size={16} /></button>
                  </div>
                  <button type="button" className={cn("btn btn-primary min-w-0 flex-1", justAdded && "btn-lit")} onClick={() => add(false)}>
                    {justAdded ? <span key={added} className="is-added inline-flex items-center gap-2"><Check size={18} aria-hidden />Added</span> : "Add to bag"}
                  </button>
                  <WishlistButton productId={p.id} initial={wishlisted} className="btn btn-ghost !px-3.5" />
                </div>
                <button type="button" className="btn btn-ink mt-3 w-full" onClick={() => add(true)}>Buy now</button>
                {showError && !res.ok && <p className="error-text" role="alert">{res.error}</p>}
                {p.trackInventory && p.stock > 0 && p.stock <= 5 && <p className="mt-3 text-[15px] font-semibold text-sale">Only {p.stock} left in this batch</p>}
              </>
            )}
            <p className="mt-5 flex items-start gap-3 text-[15px]"><Truck size={20} className="mt-0.5 shrink-0" aria-hidden /> <span>{deliveryText}</span></p>
          </div>

          <div className="mt-8">{children}</div>
        </div>
      </div>

      {/* Sticky mobile add-to-bag bar */}
      {!soldOut && (
        <div className={cn("dock-bar fixed inset-x-0 z-30 bg-paper px-4 py-3 text-paper-ink shadow-[0_-8px_24px_rgb(0_0_0/0.18)] lg:hidden", barVisible ? "visible translate-y-0" : "invisible translate-y-[200%]")} style={{ bottom: "calc(64px + var(--safe-bottom))" }} aria-hidden={!barVisible}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{p.name}</p>
              <p className="text-[15px] tabular-nums">{formatMoney(unit)}</p>
            </div>
            <button type="button" tabIndex={barVisible ? 0 : -1} className="btn shrink-0" style={{ background: "var(--paper-ink)", color: "var(--paper)" }} onClick={() => add(false)}>
              {justAdded ? <span key={added} className="is-added inline-flex items-center gap-2"><Check size={18} aria-hidden />Added</span> : "Add to bag"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
