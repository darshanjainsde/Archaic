import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ownedOrders } from "@/lib/order-scope";
import { OrderRow } from "@/components/account/order-row";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };
const PER = 10;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: raw } = await searchParams;
  const user = await requireUser("/account/orders");
  const page = Math.max(1, Math.trunc(Number(raw) || 1));
  const [total, orders] = await Promise.all([
    db.order.count({ where: ownedOrders(user) }),
    db.order.findMany({ where: ownedOrders(user), orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { items: { select: { image: true, name: true, quantity: true } } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER));
  return (
    <div className="space-y-6">
      <h1 className="text-5xl md:text-6xl">My orders</h1>
      {orders.length === 0 ? (
        <div className="bg-surface p-6" style={{ borderRadius: "var(--radius)" }}>
          <p className="text-[16px]">No orders yet.</p>
          <Link href="/shop" className="btn btn-primary mt-4">Start shopping</Link>
        </div>
      ) : (
        <ul className="space-y-3">{orders.map((o) => <OrderRow key={o.id} order={o} itemCount={o.items.reduce((a, i) => a + i.quantity, 0)} />)}</ul>
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
          {page > 1 ? <Link className="btn btn-ghost btn-sm" href={`?page=${page - 1}`}>Newer</Link> : <span />}
          <span className="text-[15px] text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link className="btn btn-ghost btn-sm" href={`?page=${page + 1}`}>Older</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
