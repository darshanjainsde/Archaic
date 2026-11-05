import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings, gatewayConfig } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { PageHeader, Panel, OrderStatusBadge, PaymentBadge, Table, CardList, OrderCard } from "@/components/admin/ui";
import type { OrderStatus } from "@prisma/client";

export const metadata = { title: "Dashboard" };

const EXCLUDED: OrderStatus[] = ["PENDING_PAYMENT", "CANCELLED", "RETURNED", "REFUNDED"];

function istDayKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export default async function Dashboard() {
  const s = await getSettings();
  const g = gatewayConfig();
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 86400000);
  const todayKey = istDayKey(now);

  const revenueWhere = { status: { notIn: EXCLUDED }, OR: [{ paymentStatus: "PAID" as const }, { paymentMethod: "COD" as const }] };
  const [orders30, toShip, pending, refundDue, lowStock, recent, totalOrders, customers] = await Promise.all([
    db.order.findMany({ where: { ...revenueWhere, createdAt: { gte: since } }, select: { total: true, createdAt: true } }),
    db.order.count({ where: { status: { in: ["CONFIRMED", "PROCESSING"] } } }),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.order.count({ where: { status: "CANCELLED", paymentStatus: "PAID" } }),
    db.product.findMany({ where: { trackInventory: true, status: "ACTIVE", stock: { lte: s.commerce.lowStockThreshold } }, orderBy: { stock: "asc" }, take: 8, select: { id: true, name: true, stock: true } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    db.order.count({ where: { status: { notIn: ["PENDING_PAYMENT"] } } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  const rev30 = orders30.reduce((a, o) => a + o.total, 0);
  const revToday = orders30.filter((o) => istDayKey(o.createdAt) === todayKey).reduce((a, o) => a + o.total, 0);
  const ordersToday = orders30.filter((o) => istDayKey(o.createdAt) === todayKey).length;
  const aov = orders30.length ? Math.round(rev30 / orders30.length) : 0;

  const days: { key: string; label: string; total: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    days.push({ key: istDayKey(d), label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d), total: 0 });
  }
  const idx = new Map(days.map((d, i) => [d.key, i]));
  for (const o of orders30) {
    const i = idx.get(istDayKey(o.createdAt));
    if (i !== undefined) days[i].total += o.total;
  }
  const max = Math.max(1, ...days.map((d) => d.total));

  const warnings: string[] = [];
  if (!g.cashfree && s.commerce.cashfreeEnabled) warnings.push("Cashfree is enabled but CASHFREE_APP_ID / CASHFREE_SECRET_KEY are missing — it is hidden at checkout.");
  if (!g.razorpay && s.commerce.razorpayEnabled) warnings.push("Razorpay is enabled but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are missing — it is hidden at checkout.");
  if (g.razorpay && !g.razorpayWebhook) warnings.push("RAZORPAY_WEBHOOK_SECRET is missing — payments only confirm when the customer returns to the site.");
  if (!g.cashfree && !g.razorpay && !s.commerce.codEnabled) warnings.push("No payment method is available. Customers cannot check out.");
  if (!g.blob) warnings.push("BLOB_READ_WRITE_TOKEN is missing — uploads are saved to local disk and will not persist on Vercel.");
  if (!g.email) warnings.push("Email is not configured (RESEND_API_KEY) — order and password emails are only logged.");

  const stats = [
    { label: "Revenue today", value: formatMoney(revToday), sub: `${ordersToday} order${ordersToday === 1 ? "" : "s"}` },
    { label: "Revenue, last 30 days", value: formatMoney(rev30), sub: `${orders30.length} orders` },
    { label: "Average order value", value: formatMoney(aov), sub: "last 30 days" },
    { label: "To ship", value: String(toShip), sub: "confirmed or processing", href: "/admin/orders?status=CONFIRMED" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`${totalOrders} orders placed · ${customers} customers`} actions={<Link href="/admin/products/new" className="btn btn-primary btn-sm">Add product</Link>} />

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-[15px] text-amber-950">
          <b>Setup needed</b>
          <ul className="mt-2 list-disc space-y-1 pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          <Link href="/admin/settings?tab=payments" className="text-btn -ml-3 mt-2 underline underline-offset-4">Open settings</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-4">
        {stats.map((st) => {
          const inner = (
            <>
              <div className="text-[14px] leading-5 text-muted">{st.label}</div>
              <div className="mt-1 break-words text-[clamp(18px,5vw,24px)] font-semibold leading-tight tabular-nums">{st.value}</div>
              <div className="mt-1 text-[13px] text-muted">{st.sub}</div>
            </>
          );
          return st.href ? (
            <Link key={st.label} href={st.href} className="min-w-0 rounded-xl border border-black/10 bg-surface p-4 hover:border-black/25">{inner}</Link>
          ) : (
            <div key={st.label} className="min-w-0 rounded-xl border border-black/10 bg-surface p-4">{inner}</div>
          );
        })}
      </div>

      <div className="grid gap-6 @4xl:grid-cols-3">
        <Panel title="Revenue by day" description="Last 30 days, India time. Paid online orders and active COD orders." className="@4xl:col-span-2">
          <svg viewBox="0 0 600 180" className="h-44 w-full" role="img" aria-label={`Daily revenue for the last 30 days, highest ${formatMoney(max)}`}>
            {days.map((d, i) => {
              const h = d.total ? Math.max(2, (d.total / max) * 150) : 0;
              return (
                <g key={d.key}>
                  <title>{`${d.label}: ${formatMoney(d.total)}`}</title>
                  <rect x={i * 20 + 3} y={160 - h} width={14} height={h} fill="var(--accent)" />
                </g>
              );
            })}
            <line x1="0" x2="600" y1="160.5" y2="160.5" stroke="currentColor" opacity=".15" />
            <text x="0" y="176" fontSize="11" fill="currentColor" opacity=".6">{days[0].label}</text>
            <text x="600" y="176" fontSize="11" textAnchor="end" fill="currentColor" opacity=".6">{days[29].label}</text>
          </svg>
          <details className="mt-2 text-[14px]">
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted">Show as a table</summary>
            <table className="mt-2 w-full text-[13px]">
              <tbody>{days.filter((d) => d.total > 0).map((d) => <tr key={d.key}><td className="py-0.5">{d.label}</td><td className="text-right tabular-nums">{formatMoney(d.total)}</td></tr>)}</tbody>
            </table>
          </details>
        </Panel>

        <div className="space-y-6">
          <Panel title="Needs attention">
            <ul className="-mx-2 text-[15px]">
              {[
                { href: "/admin/orders?status=CONFIRMED", label: "Orders to ship", n: toShip },
                { href: "/admin/orders?status=PENDING_PAYMENT", label: "Awaiting payment", n: pending },
                { href: "/admin/orders?refund=1", label: "Refund due", n: refundDue, bad: true },
              ].map((x) => (
                <li key={x.href}><Link className="flex min-h-12 items-center gap-2 rounded-lg px-2 hover:bg-black/5" href={x.href}><span className="flex-1">{x.label}</span><b className={x.bad && x.n ? "text-sale tabular-nums" : "tabular-nums"}>{x.n}</b><ChevronRight size={18} aria-hidden className="text-muted" /></Link></li>
              ))}
            </ul>
          </Panel>
          <Panel title="Low stock" description={`At or below ${s.commerce.lowStockThreshold} units`}>
            {lowStock.length === 0 ? <p className="text-[15px] text-muted">Everything is well stocked.</p> : (
              <ul className="-mx-2 text-[15px]">
                {lowStock.map((p) => <li key={p.id}><Link className="flex min-h-12 items-center gap-2 rounded-lg px-2 hover:bg-black/5" href={`/admin/products/${p.id}`}><span className="min-w-0 flex-1 truncate">{p.name}</span><b className={p.stock === 0 ? "text-sale tabular-nums" : "tabular-nums"}>{p.stock} left</b><ChevronRight size={18} aria-hidden className="text-muted" /></Link></li>)}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Recent orders" actions={<Link href="/admin/orders" className="text-btn -mr-3 -mt-3 underline underline-offset-4">All orders</Link>}>
        {recent.length === 0 ? <p className="text-[15px] text-muted">No orders yet.</p> : (
          <>
          <CardList label="Recent orders">{recent.map((o) => <OrderCard key={o.id} o={o} />)}</CardList>
          <Table hideOnPhone>
            <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td><Link className="font-semibold hover:underline" href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
                  <td>{o.user.name}</td>
                  <td className="whitespace-nowrap">{formatDate(o.createdAt, true)}</td>
                  <td><OrderStatusBadge status={o.status} /></td>
                  <td><PaymentBadge status={o.paymentStatus} /> <span className="text-[12px] text-muted">{o.paymentMethod}</span></td>
                  <td className="text-right tabular-nums">{formatMoney(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          </>
        )}
      </Panel>
    </div>
  );
}
