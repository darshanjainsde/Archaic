"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { useCart, cart } from "@/lib/cart-store";
import { Img } from "@/components/ui/img";
import { EmptyState } from "@/components/ui/empty";
import { formatMoney } from "@/lib/money";
import { addressSchema, fieldErrors } from "@/lib/address";
import { placeOrder } from "@/actions/checkout";
import { useQuote } from "./use-quote";
import { SummaryRows } from "./summary";
import { CouponForm } from "./coupon-form";
import { AddressFields, EMPTY_ADDRESS, type AddressForm } from "./address-fields";
import { launchPayment } from "./launch-payment";
import { paperVars } from "./paper";

type Method = "RAZORPAY" | "CASHFREE" | "COD";
type SavedAddress = { id: string; name: string; phone: string; line1: string; line2: string | null; landmark: string | null; city: string; state: string; pincode: string; isDefault: boolean };

const METHOD_LABEL: Record<Method, { title: string; text: string }> = {
  CASHFREE: { title: "Pay online", text: "UPI, cards, net banking and wallets — secured by Cashfree" },
  RAZORPAY: { title: "Pay online", text: "UPI, cards, net banking and wallets — secured by Razorpay" },
  COD: { title: "Cash on Delivery", text: "Pay in cash or UPI when your order arrives" },
};

export function CheckoutView(p: {
  user: { name: string; email: string; phone: string | null };
  addresses: SavedAddress[];
  methods: Method[];
  codFee: number;
  codMaxOrder: number;
  giftWrapEnabled: boolean;
  giftWrapPrice: number;
  storeName: string;
  accent: string;
  deliveryText: string;
}) {
  const router = useRouter();
  const c = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [addressId, setAddressId] = useState<string>(p.addresses[0]?.id ?? "new");
  const [addr, setAddr] = useState<AddressForm>({ ...EMPTY_ADDRESS, name: p.user.name, phone: p.user.phone ?? "" });
  const [saveAddress, setSaveAddress] = useState(true);
  const [method, setMethod] = useState<Method | null>(p.methods[0] ?? null);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [paying, setPaying] = useState(false);
  const busy = useRef(false);
  const { quote, loading } = useQuote(c.lines, c.couponCode, c.giftWrap, method);

  const codBlocked = useMemo(() => Boolean(quote && p.codMaxOrder > 0 && quote.total - quote.codFee > p.codMaxOrder), [quote, p.codMaxOrder]);
  useEffect(() => {
    if (method === "COD" && codBlocked) {
      const alt = p.methods.find((m) => m !== "COD");
      if (alt) setMethod(alt);
    }
  }, [codBlocked, method, p.methods]);

  if (!mounted) return <div className="skeleton h-96 w-full" aria-label="Loading checkout" />;
  if (c.lines.length === 0) return <EmptyState title="Your bag is empty" text="Add something to your bag before checking out." href="/shop" cta="Browse candles" />;

  const submit = () => {
    if (busy.current) return;
    setFormError(null);
    setErrors({});
    if (!method) { setFormError("Choose a payment method"); return; }
    if (addressId === "new") {
      const v = addressSchema.safeParse(addr);
      if (!v.success) {
        setErrors(fieldErrors(v.error));
        setFormError("Please check the delivery address");
        document.getElementById("delivery")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    busy.current = true;
    startTransition(async () => {
      try {
        const res = await placeOrder({
          lines: c.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, selections: l.selections, personalization: l.personalization ?? null })),
          couponCode: c.couponCode,
          giftWrap: c.giftWrap,
          isGift: c.giftWrap,
          giftMessage: c.giftWrap ? c.giftMessage : null,
          notes,
          paymentMethod: method,
          addressId: addressId === "new" ? null : addressId,
          address: addressId === "new" ? addr : undefined,
          saveAddress,
          phone: addressId === "new" ? addr.phone : null,
        });
        if (!res.ok) {
          setFormError(res.error);
          if (res.fieldErrors) setErrors(Object.fromEntries(Object.entries(res.fieldErrors).map(([k, v]) => [k.replace(/^address\./, ""), v])));
          busy.current = false;
          return;
        }
        const n = res.launch.number;
        if (res.launch.kind === "cod") {
          cart.clear();
          router.replace(`/order/${n}`);
          return;
        }
        setPaying(true);
        try {
          const outcome = await launchPayment(res.launch, p.accent);
          if (outcome === "paid") {
            cart.clear();
            router.replace(`/order/${n}`);
          } else if (outcome === "dismissed") {
            toast("Payment not completed", { description: `Order ${n} is saved. You can pay for it from My orders.` });
            router.replace(`/account/orders/${n}`);
          }
          // "redirect": the browser is leaving for Cashfree
        } catch (e) {
          toast.error((e as Error).message || "Payment failed");
          router.replace(`/account/orders/${n}`);
        }
      } catch {
        setFormError("Something went wrong. Please check your connection and try again.");
        busy.current = false;
      }
    });
  };

  const disabled = pending || paying || loading || !quote || quote.hasErrors || !method;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start">
      <div className="space-y-10">
        <section aria-labelledby="contact-h">
          <h2 id="contact-h" className="mb-3 text-3xl">Contact</h2>
          <p className="text-[16px]">{p.user.name} · {p.user.email}{p.user.phone ? ` · ${p.user.phone}` : ""}</p>
        </section>

        <section id="delivery" aria-labelledby="delivery-h" className="scroll-mt-24">
          <h2 id="delivery-h" className="mb-4 text-3xl">Delivery address</h2>
          <fieldset className="space-y-3">
            <legend className="sr-only">Choose a delivery address</legend>
            {p.addresses.map((a) => (
              <label key={a.id} className={`flex cursor-pointer gap-3 p-4 ${addressId === a.id ? "bg-paper text-paper-ink" : "bg-surface"}`} style={{ borderRadius: "var(--radius)" }}>
                <input type="radio" name="address" className="mt-1 h-5 w-5 accent-[var(--accent)]" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                <span className="text-[16px]">
                  <b>{a.name}</b> · {a.phone}{a.isDefault ? " · Default" : ""}
                  <span className="block">{[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}</span>
                  <span className="block">{a.city}, {a.state} {a.pincode}</span>
                </span>
              </label>
            ))}
            {p.addresses.length > 0 && (
              <label className={`flex cursor-pointer items-center gap-3 p-4 ${addressId === "new" ? "bg-paper text-paper-ink" : "bg-surface"}`} style={{ borderRadius: "var(--radius)" }}>
                <input type="radio" name="address" className="h-5 w-5 accent-[var(--accent)]" checked={addressId === "new"} onChange={() => setAddressId("new")} />
                <span className="font-semibold">Deliver to a new address</span>
              </label>
            )}
          </fieldset>
          {addressId === "new" && (
            <div className="mt-5 space-y-4">
              <AddressFields value={addr} onChange={setAddr} errors={errors} />
              <label className="flex items-center gap-3 text-[16px]">
                <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                Save this address for next time
              </label>
            </div>
          )}
          <p className="hint mt-3 text-[15px]">{p.deliveryText}</p>
        </section>

        {p.giftWrapEnabled && (
          <section aria-labelledby="gift-h">
            <h2 id="gift-h" className="mb-4 text-3xl">Is this a gift?</h2>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--accent)]" checked={c.giftWrap} onChange={(e) => cart.setGift(e.target.checked)} />
              <span><b>Gift wrap with a handwritten card</b><span className="block text-[15px] text-muted">{p.giftWrapPrice > 0 ? formatMoney(p.giftWrapPrice) : "Free"}{quote && quote.memberPct > 0 ? " — free for members" : ""}. Prices are not included in the parcel.</span></span>
            </label>
            {c.giftWrap && (
              <div className="mt-4">
                <label htmlFor="co-gift" className="label">Message for the card</label>
                <textarea id="co-gift" className="field min-h-24" maxLength={200} value={c.giftMessage} onChange={(e) => cart.setGift(true, e.target.value.slice(0, 200))} aria-describedby="co-gift-hint" />
                <p id="co-gift-hint" className="hint">{200 - c.giftMessage.length} characters left</p>
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="pay-h">
          <h2 id="pay-h" className="mb-4 text-3xl">Payment</h2>
          {p.methods.length === 0 ? (
            <p className="bg-surface p-4 text-[16px]" role="alert" style={{ borderRadius: "var(--radius)" }}>Checkout is paused right now — no payment method is available. Please try again shortly or contact us.</p>
          ) : (
            <fieldset className="space-y-3">
              <legend className="sr-only">Choose a payment method</legend>
              {p.methods.map((m) => {
                const blocked = m === "COD" && codBlocked;
                const lbl = METHOD_LABEL[m];
                const onlineCount = p.methods.filter((x) => x !== "COD").length;
                return (
                  <label key={m} className={`flex gap-3 p-4 ${blocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${method === m ? "bg-paper text-paper-ink" : "bg-surface"}`} style={{ borderRadius: "var(--radius)" }}>
                    <input type="radio" name="method" className="mt-1 h-5 w-5 accent-[var(--accent)]" checked={method === m} disabled={blocked} onChange={() => setMethod(m)} />
                    <span className="text-[16px]">
                      <b>{onlineCount > 1 && m !== "COD" ? `${lbl.title} (${m === "CASHFREE" ? "Cashfree" : "Razorpay"})` : lbl.title}</b>
                      <span className="block text-[15px] opacity-80">{lbl.text}{m === "COD" && p.codFee > 0 ? ` · ${formatMoney(p.codFee)} fee` : ""}</span>
                      {blocked && <span className="block text-[15px] font-semibold">Not available above {formatMoney(p.codMaxOrder)}</span>}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
          <div className="mt-5">
            <label htmlFor="co-notes" className="label">Order notes (optional)</label>
            <textarea id="co-notes" className="field min-h-20" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, preferred date…" />
          </div>
        </section>
      </div>

      <aside className="bg-paper p-6 text-paper-ink lg:sticky lg:top-24" style={paperVars} aria-label="Order summary">
        <h2 className="mb-4 flex items-center gap-2 text-3xl">Your order {loading && <Loader2 size={18} className="animate-spin" aria-label="Updating" />}</h2>
        <ul className="mb-5 space-y-3">
          {c.lines.map((l, i) => {
            const q = quote?.lines[i];
            return (
              <li key={l.key} className="flex gap-3">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden bg-surface"><Img src={q?.image ?? l.image} alt="" fill sizes="56px" className="object-cover" /></div>
                <div className="min-w-0 flex-1 text-[15px]">
                  <p className="font-semibold leading-snug">{l.name} × {l.quantity}</p>
                  {l.selectionLabels.length > 0 && <p className="text-muted">{l.selectionLabels.map((s) => s.value).join(" · ")}</p>}
                  {q?.error && <p className="font-semibold text-sale">{q.error}</p>}
                </div>
                <span className="text-[15px] tabular-nums">{formatMoney(q && !q.error ? q.lineTotal : l.unitPrice * l.quantity)}</span>
              </li>
            );
          })}
        </ul>
        <CouponForm code={c.couponCode} error={quote?.couponError ?? null} applied={Boolean(quote?.couponCode)} onApply={(code) => cart.setCoupon(code)} />
        <div className="mt-5">{quote ? <SummaryRows q={quote} showCod /> : <div className="skeleton h-32" />}</div>
        {quote?.hasErrors && <p className="error-text mt-3" role="alert">Some items need attention. <Link href="/cart" className="underline">Review your bag</Link></p>}
        {formError && <p className="error-text mt-3 text-[15px]" role="alert">{formError}</p>}
        <button type="button" onClick={submit} disabled={disabled} aria-busy={pending || paying} className="btn mt-6 w-full" style={{ background: "var(--paper-ink)", color: "var(--paper)" }}>
          {pending || paying ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Lock size={16} aria-hidden />}
          {paying ? "Opening payment…" : pending ? "Placing order…" : method === "COD" ? `Place order · ${quote ? formatMoney(quote.total) : ""}` : `Pay ${quote ? formatMoney(quote.total) : ""}`}
        </button>
        <p className="mt-3 text-center text-[14px] opacity-80">By placing this order you agree to our <Link href="/pages/terms" className="underline">terms</Link>.</p>
      </aside>
    </div>
  );
}
