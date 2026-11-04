import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Img } from "@/components/ui/img";
import { ClearCart } from "@/components/checkout/clear-cart";
import type { SelectionSnapshot, ShippingAddress } from "@/lib/types";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

export default async function OrderThanks({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/order/${number}`);
  const order = await db.order.findUnique({ where: { number }, include: { items: true } });
  if (!order || order.userId !== user.id) notFound();
  if (order.status === "PENDING_PAYMENT") redirect(`/account/orders/${number}`);
  const s = await getSettings();
  const a = order.shippingAddress as ShippingAddress;
  return (
    <main className="container-x py-12 md:py-20">
      <ClearCart />
      <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl">Thank you, {user.name.split(" ")[0]}</h1>
          <p className="max-w-xl text-lg">
            Order <b className="tabular-nums">{order.number}</b> is confirmed{order.paymentMethod === "COD" ? " — pay when it arrives" : " and paid"}. A confirmation is on its way to {order.email}.
          </p>
          <div className="bg-surface p-6" style={{ borderRadius: "var(--radius)" }}>
            <h2 className="mb-3 text-2xl">What happens next</h2>
            <ol className="list-decimal space-y-2 pl-5 text-[16px]">
              <li>We pour and pack your order within {s.commerce.dispatchDays} working days.</li>
              <li>You get a tracking number by email when it ships.</li>
              <li>It arrives in about {s.commerce.deliveryDaysMin}–{s.commerce.deliveryDaysMax} days{order.estimatedDelivery ? `, by ${formatDate(order.estimatedDelivery)}` : ""}.</li>
            </ol>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/account/orders/${order.number}`} className="btn btn-primary">Track this order</Link>
            <Link href="/shop" className="btn btn-ghost">Continue shopping</Link>
          </div>
        </div>
        <aside className="bg-paper p-6 text-paper-ink" style={{ borderRadius: "var(--radius)" }}>
          <h2 className="mb-4 text-2xl">Order summary</h2>
          <ul className="space-y-3">
            {order.items.map((i) => (
              <li key={i.id} className="flex gap-3 text-[15px]">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden"><Img src={i.image} alt="" fill sizes="56px" className="object-cover" /></div>
                <div className="flex-1"><b>{i.name} × {i.quantity}</b><div className="opacity-80">{(i.selections as SelectionSnapshot[]).map((x) => x.value).join(" · ")}</div></div>
                <span className="tabular-nums">{formatMoney(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between text-xl font-semibold"><span>Total</span><span className="tabular-nums">{formatMoney(order.total)}</span></div>
          <p className="mt-4 text-[15px]">Delivering to {a.name}, {a.city} {a.pincode}</p>
        </aside>
      </div>
    </main>
  );
}
