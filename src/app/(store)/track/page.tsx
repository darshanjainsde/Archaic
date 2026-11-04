import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { formatDate } from "@/lib/utils";
import { OrderTimeline } from "@/components/account/timeline";
import { StatusTag } from "@/components/account/status-tag";

export const metadata: Metadata = { title: "Track your order", description: "Track an Archaic Candles order with your order number and email or phone." };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string; contact?: string }> }) {
  const sp = await searchParams;
  const number = (sp.order ?? "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 20);
  const contact = (sp.contact ?? "").trim().toLowerCase().slice(0, 160);
  const user = await getCurrentUser();

  let error: string | null = null;
  let order: Awaited<ReturnType<typeof find>> = null;
  async function find() {
    return db.order.findUnique({ where: { number }, include: { events: { where: { isPublic: true }, orderBy: { createdAt: "asc" } }, items: { select: { name: true, quantity: true } } } });
  }
  if (number || contact) {
    if (!number || !contact) error = "Enter both your order number and the email or phone used for it.";
    else {
      const rl = rateLimit(`track:${await clientIp()}`, 20, 10 * 60_000);
      if (!rl.ok) error = "Too many lookups. Please try again in a few minutes.";
      else {
        const o = await find();
        const phone = contact.replace(/\D/g, "").slice(-10);
        const addrPhone = String((o?.shippingAddress as { phone?: string } | null)?.phone ?? "").replace(/\D/g, "").slice(-10);
        const match = o && (o.email.toLowerCase() === contact || (phone.length === 10 && phone === addrPhone));
        if (!match) error = "We could not find an order with those details. Check the order number (it starts with AC) and the email or phone.";
        else order = o;
      }
    }
  }

  return (
    <main className="container-x py-10 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
        <div className="space-y-5">
          <h1 className="text-5xl md:text-6xl">Track your order</h1>
          <p className="text-lg">Your order number is in the confirmation email and starts with AC.</p>
          <form className="space-y-4 bg-surface p-6" style={{ borderRadius: "var(--radius)" }} method="get">
            <div>
              <label htmlFor="t-order" className="label">Order number</label>
              <input id="t-order" name="order" className="field uppercase" defaultValue={number} placeholder="AC10001" autoComplete="off" autoCapitalize="characters" required maxLength={20} aria-describedby={error ? "t-err" : undefined} />
            </div>
            <div>
              <label htmlFor="t-contact" className="label">Email or mobile number</label>
              <input id="t-contact" name="contact" className="field" defaultValue={contact} autoComplete="email" required maxLength={160} aria-describedby={error ? "t-err" : undefined} />
            </div>
            {error && <p id="t-err" className="error-text text-[15px]" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary w-full">Track order</button>
            {user && <p className="text-[15px]">Signed in? See everything in <Link href="/account/orders" className="underline">My orders</Link>.</p>}
          </form>
        </div>
        <section aria-live="polite" aria-label="Order status">
          {order ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-4xl tabular-nums">{order.number}</h2>
                  <p className="text-[16px] text-muted">Placed {formatDate(order.createdAt)} · {order.items.reduce((a, i) => a + i.quantity, 0)} item(s)</p>
                </div>
                <StatusTag status={order.status} />
              </div>
              <OrderTimeline status={order.status} events={order.events} eta={order.estimatedDelivery} />
              {(order.courier || order.trackingNumber) && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 bg-surface p-4 text-[16px]" style={{ borderRadius: "var(--radius)" }}>
                  {order.courier && <span>Courier <b>{order.courier}</b></span>}
                  {order.trackingNumber && <span>Tracking number <b className="tabular-nums">{order.trackingNumber}</b></span>}
                  {order.trackingUrl && /^https?:\/\//.test(order.trackingUrl) && <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline">Track shipment <ExternalLink size={15} aria-hidden /></a>}
                </div>
              )}
            </div>
          ) : (
            <div className="hidden bg-surface p-8 lg:block" style={{ borderRadius: "var(--radius)" }}>
              <h2 className="text-3xl">Where your order is</h2>
              <p className="mt-3 max-w-md text-[16px]">Once you enter your details you will see each step — confirmed, being prepared, shipped, out for delivery and delivered — with the courier tracking link as soon as it ships.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
