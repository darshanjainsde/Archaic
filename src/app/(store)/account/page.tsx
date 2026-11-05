import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { lifetimeSpend } from "@/lib/orders";
import { ownedOrders } from "@/lib/order-scope";
import { tierForSpend } from "@/lib/membership";
import { MembershipCard } from "@/components/account/membership-card";
import { OrderRow } from "@/components/account/order-row";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ reset?: string; verify?: string }> }) {
  const { reset, verify } = await searchParams;
  const user = await requireUser("/account");
  const [s, spend, orders, pending] = await Promise.all([
    getSettings(),
    lifetimeSpend(user.id),
    db.order.findMany({ where: ownedOrders(user), orderBy: { createdAt: "desc" }, take: 3, include: { items: { select: { image: true, name: true }, take: 4 } } }),
    db.order.count({ where: { ...ownedOrders(user), status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY"] } } }),
  ]);
  const t = tierForSpend(s.membership.tiers, spend);
  return (
    <div className="space-y-10">
      {verify && <p role="status" className="bg-surface p-4 text-[16px]" style={{ borderRadius: "var(--radius)" }}>{verify === "done" ? "Thank you, your email is confirmed." : verify === "sent" ? "We emailed you a confirmation link. It is valid for 24 hours." : "That link has expired. Request a new one above."}</p>}
      {reset && <p role="status" className="bg-surface p-4 text-[16px]" style={{ borderRadius: "var(--radius)" }}>Your password has been changed.</p>}
      <div>
        <h1 className="text-5xl md:text-6xl">Hello, {user.name.split(" ")[0]}</h1>
        <p className="mt-3 text-lg">{pending > 0 ? `${pending} order${pending > 1 ? "s" : ""} on the way.` : "Nothing on the way right now."}</p>
      </div>
      {s.membership.enabled && <MembershipCard programme={s.membership.name} current={t.current} next={t.next} progress={t.progress} remaining={t.remaining} spend={spend} compact />}
      <section aria-labelledby="recent-h">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="recent-h" className="text-3xl">Recent orders</h2>
          {orders.length > 0 && <Link href="/account/orders" className="text-[16px] underline">All orders</Link>}
        </div>
        {orders.length === 0 ? (
          <div className="bg-surface p-6" style={{ borderRadius: "var(--radius)" }}>
            <p className="text-[16px]">You have not ordered yet.</p>
            <Link href="/shop" className="btn btn-primary mt-4">Find your first candle</Link>
          </div>
        ) : (
          <ul className="space-y-3">{orders.map((o) => <OrderRow key={o.id} order={o} />)}</ul>
        )}
      </section>
    </div>
  );
}
