import Link from "next/link";
import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { fdate } from "@/lib/form-data";
import { PageHeader, Table, OrderStatusBadge, PaymentBadge, Pagination, Empty, CardList, OrderCard } from "@/components/admin/ui";

export const metadata = { title: "Orders" };
const PER = 30;
const TABS: { v: string; label: string; statuses?: OrderStatus[] }[] = [
  { v: "", label: "All" },
  { v: "CONFIRMED", label: "To ship", statuses: ["CONFIRMED", "PROCESSING"] },
  { v: "SHIPPED", label: "In transit", statuses: ["SHIPPED", "OUT_FOR_DELIVERY"] },
  { v: "DELIVERED", label: "Delivered", statuses: ["DELIVERED"] },
  { v: "PENDING_PAYMENT", label: "Awaiting payment", statuses: ["PENDING_PAYMENT"] },
  { v: "RETURNS", label: "Returns", statuses: ["RETURN_REQUESTED", "RETURNED"] },
  { v: "CANCELLED", label: "Cancelled", statuses: ["CANCELLED", "REFUNDED"] },
];

export default async function Orders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const tab = TABS.find((t) => t.v === (sp.status ?? "")) ?? TABS[0];
  const pay = ["PENDING", "PAID", "FAILED", "REFUNDED", "COD_PENDING"].includes(sp.payment ?? "") ? (sp.payment as PaymentStatus) : undefined;
  const fd = new FormData();
  if (sp.from) fd.set("from", sp.from);
  if (sp.to) fd.set("to", sp.to);
  const from = fdate(fd, "from");
  const to = fdate(fd, "to");
  const where: Prisma.OrderWhereInput = {
    ...(tab.statuses ? { status: { in: tab.statuses } } : {}),
    ...(sp.refund ? { status: "CANCELLED", paymentStatus: "PAID" } : {}),
    ...(pay ? { paymentStatus: pay } : {}),
    ...(from || to ? { createdAt: { ...(from && { gte: from }), ...(to && { lt: new Date(to.getTime() + 86400000) }) } } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { user: { name: { contains: q, mode: "insensitive" } } }, { trackingNumber: { contains: q } }] } : {}),
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { user: { select: { name: true } }, _count: { select: { items: true } } } }),
    db.order.count({ where }),
  ]);
  const qs = (extra: Record<string, string>) => new URLSearchParams(Object.fromEntries(Object.entries({ q, status: sp.status ?? "", payment: sp.payment ?? "", from: sp.from ?? "", to: sp.to ?? "", ...extra }).filter(([, v]) => v))).toString();

  return (
    <div>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? "" : "s"}${sp.refund ? " with refund due" : ""}`} />
      <nav aria-label="Order status" className="mb-4 flex flex-wrap gap-2 text-[15px]">
        {TABS.map((t) => (
          <Link key={t.v} href={`/admin/orders?${qs({ status: t.v, page: "" })}`} aria-current={tab.v === t.v && !sp.refund ? "page" : undefined} className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 ${tab.v === t.v && !sp.refund ? "border-ink bg-ink text-bg" : "border-black/15 bg-surface hover:border-black/30"}`}>{t.label}</Link>
        ))}
        <Link href="/admin/orders?refund=1" aria-current={sp.refund ? "page" : undefined} className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 ${sp.refund ? "border-ink bg-ink text-bg" : "border-black/15 bg-surface hover:border-black/30"}`}>Refund due</Link>
      </nav>
      <form className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_170px_170px_auto]">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input name="q" defaultValue={q} type="search" placeholder="Order number, email, name, AWB…" aria-label="Search orders" autoComplete="off" className="field sm:col-span-2 lg:col-span-1" />
        <select name="payment" defaultValue={sp.payment ?? ""} aria-label="Payment status" className="field">
          <option value="">Any payment</option><option value="PAID">Paid</option><option value="PENDING">Unpaid</option><option value="COD_PENDING">COD due</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option>
        </select>
        <label className="flex min-w-0 items-center gap-2"><span className="w-12 shrink-0 text-[14px] text-muted lg:sr-only">From</span><input type="date" name="from" defaultValue={sp.from} aria-label="From date" className="field min-w-0" /></label>
        <label className="flex min-w-0 items-center gap-2"><span className="w-12 shrink-0 text-[14px] text-muted lg:sr-only">To</span><input type="date" name="to" defaultValue={sp.to} aria-label="To date" className="field min-w-0" /></label>
        <button className="btn btn-ink sm:col-span-2 lg:col-span-1">Filter</button>
      </form>
      {orders.length === 0 ? <Empty>No orders match these filters.</Empty> : (
        <>
        <CardList label="Orders">{orders.map((o) => <OrderCard key={o.id} o={{ ...o, items: o._count.items }} />)}</CardList>
        <Table hideOnPhone>
          <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link className="font-semibold hover:underline" href={`/admin/orders/${o.id}`}>{o.number}</Link>{o.isGift && <div className="text-[12px] text-muted">Gift</div>}</td>
                <td className="whitespace-nowrap">{formatDate(o.createdAt, true)}</td>
                <td>{o.user.name}<div className="text-[12px] text-muted">{o.email}</div></td>
                <td className="tabular-nums">{o._count.items}</td>
                <td><OrderStatusBadge status={o.status} /></td>
                <td className="whitespace-nowrap"><PaymentBadge status={o.paymentStatus} /> <span className="text-[12px] text-muted">{o.paymentMethod}</span></td>
                <td className="text-right tabular-nums">{formatMoney(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        </>
      )}
      <Pagination page={page} pages={Math.ceil(total / PER)} makeHref={(p) => `/admin/orders?${qs({ page: String(p), ...(sp.refund ? { refund: "1" } : {}) })}`} />
    </div>
  );
}
