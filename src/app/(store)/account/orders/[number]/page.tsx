import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings, availablePaymentMethods } from "@/lib/settings";
import { CUSTOMER_CANCELLABLE } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Img } from "@/components/ui/img";
import { OrderTimeline } from "@/components/account/timeline";
import { StatusTag } from "@/components/account/status-tag";
import { PAYMENT_TEXT } from "@/components/account/status";
import { PriceBreakdown } from "@/components/account/price-breakdown";
import { OrderActions } from "@/components/account/order-actions";
import { PayNowButton } from "@/components/checkout/pay-now-button";
import type { SelectionSnapshot, ShippingAddress } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const { number } = await params;
  return { title: `Order ${number}`, robots: { index: false } };
}

const METHOD: Record<string, string> = { RAZORPAY: "Online (Razorpay)", CASHFREE: "Online (Cashfree)", COD: "Cash on Delivery" };

export default async function OrderDetail({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  const order = await db.order.findUnique({ where: { number }, include: { items: true, events: { where: { isPublic: true }, orderBy: { createdAt: "asc" } } } });
  if (!order || order.userId !== user.id) notFound();
  const s = await getSettings();
  const a = order.shippingAddress as ShippingAddress;
  const deliveredAt = order.events.filter((e) => e.status === "DELIVERED").at(-1)?.createdAt;
  const canReturn = s.commerce.returnsEnabled && order.status === "DELIVERED" && Boolean(deliveredAt) && Date.now() - deliveredAt!.getTime() <= s.commerce.returnDays * 86400000;
  const canPay = order.status === "PENDING_PAYMENT" && order.paymentMethod !== "COD" && availablePaymentMethods(s).some((m) => m !== "COD");

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/account/orders" className="text-[15px] underline">All orders</Link>
          <h1 className="mt-2 text-5xl tabular-nums md:text-6xl">{order.number}</h1>
          <p className="mt-2 text-[16px] text-muted">Placed {formatDate(order.createdAt, true)}</p>
        </div>
        <StatusTag status={order.status} />
      </div>

      {order.status === "PENDING_PAYMENT" && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-paper p-5 text-paper-ink" style={{ borderRadius: "var(--radius)" }}>
          <p className="text-[16px]"><b>Payment pending.</b> {order.paymentStatus === "FAILED" ? "The last attempt did not go through. " : ""}Complete the payment to confirm your order.</p>
          {canPay ? <PayNowButton number={order.number} accent={s.theme.colors.accent} label={`Pay ${formatMoney(order.total)}`} /> : <p className="text-[15px]">Online payment is unavailable right now.</p>}
        </div>
      )}

      <section aria-labelledby="track-h">
        <h2 id="track-h" className="mb-5 text-3xl">Tracking</h2>
        <OrderTimeline status={order.status} events={order.events} eta={order.estimatedDelivery} />
        {(order.trackingNumber || order.courier) && (
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 bg-surface p-4 text-[16px]" style={{ borderRadius: "var(--radius)" }}>
            {order.courier && <span>Courier <b>{order.courier}</b></span>}
            {order.trackingNumber && <span>Tracking number <b className="tabular-nums">{order.trackingNumber}</b></span>}
            {order.trackingUrl && /^https?:\/\//.test(order.trackingUrl) && (
              <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline">Track shipment <ExternalLink size={15} aria-hidden /></a>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="items-h" className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 id="items-h" className="mb-4 text-3xl">Items</h2>
          <ul className="space-y-3">
            {order.items.map((i) => (
              <li key={i.id} className="grid grid-cols-[72px_1fr_auto] gap-4 bg-surface p-4" style={{ borderRadius: "var(--radius)" }}>
                <div className="relative aspect-[4/5] overflow-hidden bg-bg"><Img src={i.image} alt={i.name} fill sizes="72px" className="object-cover" /></div>
                <div className="min-w-0 text-[16px]">
                  {i.slug ? <Link href={`/product/${i.slug}`} className="font-semibold hover:underline">{i.name}</Link> : <b>{i.name}</b>}
                  <p className="text-[15px] text-muted">{(i.selections as SelectionSnapshot[]).map((x) => `${x.group}: ${x.value}`).join(" · ")}</p>
                  {i.personalization && <p className="text-[15px] text-muted">Label: “{i.personalization}”</p>}
                  <p className="text-[15px]">{formatMoney(i.unitPrice)} × {i.quantity}</p>
                </div>
                <span className="font-semibold tabular-nums">{formatMoney(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {order.isGift && <p className="mt-4 text-[16px]"><b>Gift wrapped.</b>{order.giftMessage ? ` Card: “${order.giftMessage}”` : ""}</p>}
          <div className="mt-6">
            <OrderActions number={order.number} canCancel={CUSTOMER_CANCELLABLE.includes(order.status)} paid={order.paymentStatus === "PAID"} canReturn={canReturn} returnDays={s.commerce.returnDays} />
          </div>
        </div>
        <aside className="space-y-6">
          <div className="bg-paper p-6 text-paper-ink" style={{ borderRadius: "var(--radius)" }}>
            <h2 className="mb-4 text-2xl">Payment</h2>
            <PriceBreakdown o={order} />
            <p className="mt-4 text-[15px]">{METHOD[order.paymentMethod]} · {PAYMENT_TEXT[order.paymentStatus]}{order.paidAt ? ` on ${formatDate(order.paidAt)}` : ""}</p>
            {order.status !== "PENDING_PAYMENT" && <Link href={`/account/orders/${order.number}/invoice`} className="mt-3 inline-block text-[15px] font-semibold underline">View invoice</Link>}
          </div>
          <div className="bg-surface p-6" style={{ borderRadius: "var(--radius)" }}>
            <h2 className="mb-3 text-2xl">Delivering to</h2>
            <address className="text-[16px] not-italic">
              <b>{a.name}</b><br />
              {[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}<br />
              {a.city}, {a.state} {a.pincode}<br />
              {a.phone}
            </address>
          </div>
        </aside>
      </section>
    </div>
  );
}
