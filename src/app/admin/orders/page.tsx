import Link from "next/link";
import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { fdate } from "@/lib/form-data";
import { PageHeader, Table, OrderStatusBadge, PaymentBadge, Pagination, Empty } from "@/components/admin/ui";

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
      <div className="no-scrollbar -mx-4 mb-4 flex gap-1 overflow-x-auto px-4 text-[14px]">
        {TABS.map((t) => (
          <Link key={t.v} href={`/admin/orders?${qs({ status: t.v, page: "" })}`} className={`whitespace-nowrap rounded-md px-3 py-1.5 ${tab.v === t.v && !sp.refund ? "bg-ink text-bg" : "hover:bg-black/5"}`}>{t.label}</Link>
        ))}
        <Link href="/admin/orders?refund=1" className={`whitespace-nowrap rounded-md px-3 py-1.5 ${sp.refund ? "bg-ink text-bg" : "hover:bg-black/5"}`}>Refund due</Link>
      </div>
      <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_170px_160px_160px_auto]">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input name="q" defaultValue={q} placeholder="Order number, email, name, AWB" aria-label="Search orders" className="field !min-h-[40px] !py-2" />
        <select name="payment" defaultValue={sp.payment ?? ""} aria-label="Payment status" className="field !min-h-[40px] !py-2">
          <option value="">Any payment</option><option value="PAID">Paid</option><option value="PENDING">Unpaid</option><option value="COD_PENDING">COD due</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option>
        </select>
        <input type="date" name="from" defaultValue={sp.from} aria-label="From date" className="field !min-h-[40px] !py-2" />
        <input type="date" name="to" defaultValue={sp.to} aria-label="To date" className="field !min-h-[40px] !py-2" />
        <button className="btn btn-ink btn-sm !min-h-[40px]">Filter</button>
      </form>
      {orders.length === 0 ? <Empty>No orders match these filters.</Empty> : (
        <Table>
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
      )}
      <Pagination page={page} pages={Math.ceil(total / PER)} makeHref={(p) => `/admin/orders?${qs({ page: String(p), ...(sp.refund ? { refund: "1" } : {}) })}`} />
    </div>
  );
}
