import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { lifetimeSpend } from "@/lib/orders";
import { tierForSpend } from "@/lib/membership";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PageHeader, Panel, Table, OrderStatusBadge, PaymentBadge, Tag } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/action-form";
import { setUserRole } from "@/actions/admin/catalog";

export const metadata = { title: "Customer" };

export default async function Customer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [u, me, s] = await Promise.all([
    db.user.findUnique({ where: { id }, include: { addresses: true, orders: { orderBy: { createdAt: "desc" }, take: 50 }, _count: { select: { reviews: true, wishlist: true } } } }),
    getCurrentUser(),
    getSettings(),
  ]);
  if (!u) notFound();
  const spend = await lifetimeSpend(u.id);
  const tier = tierForSpend(s.membership.tiers, spend);
  return (
    <div className="space-y-6">
      <PageHeader title={u.name} description={`Customer since ${formatDate(u.createdAt)}`} back={{ href: "/admin/customers", label: "Customers" }}
        actions={u.id !== me?.id && (u.role === "ADMIN"
          ? <ConfirmButton className="btn btn-ghost btn-sm" confirmText={`Remove admin access from ${u.name}?`} action={setUserRole.bind(null, u.id, "CUSTOMER")}>Remove admin access</ConfirmButton>
          : <ConfirmButton className="btn btn-ghost btn-sm" confirmText={`Give ${u.name} full admin access to the store?`} action={setUserRole.bind(null, u.id, "ADMIN")}>Make admin</ConfirmButton>)} />
      <div className="grid gap-6 @4xl:grid-cols-3">
        <Panel title="Contact">
          <p className="text-[14px]">{u.email}</p>
          <p className="text-[14px]">{u.phone || <span className="text-muted">No phone</span>}</p>
          <p className="mt-2 text-[13px] text-muted">{u.marketingOptIn ? "Subscribed to emails" : "Not subscribed to emails"}</p>
          {u.role === "ADMIN" && <div className="mt-2"><Tag tone="amber">Admin</Tag></div>}
        </Panel>
        <Panel title="Membership">
          <p className="text-2xl font-semibold">{s.membership.enabled ? tier.current.name : "Off"}</p>
          <p className="text-[14px] text-muted">Lifetime spend {formatMoney(spend)}</p>
          {tier.next && <p className="text-[13px] text-muted">{formatMoney(tier.remaining)} to {tier.next.name}</p>}
        </Panel>
        <Panel title="Activity">
          <p className="text-[14px]">{u.orders.length} orders · {u._count.reviews} reviews · {u._count.wishlist} wishlisted</p>
        </Panel>
      </div>
      <Panel title="Addresses">
        {u.addresses.length === 0 ? <p className="text-[14px] text-muted">No saved addresses.</p> : (
          <ul className="grid gap-3 @md:grid-cols-2">
            {u.addresses.map((a) => (
              <li key={a.id} className="rounded-md bg-field/60 p-3 text-[14px]">
                <b>{a.name}</b>{a.isDefault && <span className="ml-2"><Tag>Default</Tag></span>}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Orders">
        {u.orders.length === 0 ? <p className="text-[14px] text-muted">No orders yet.</p> : (
          <Table>
            <thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {u.orders.map((o) => (
                <tr key={o.id}>
                  <td><Link className="font-semibold hover:underline" href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
                  <td className="whitespace-nowrap">{formatDate(o.createdAt, true)}</td>
                  <td><OrderStatusBadge status={o.status} /></td>
                  <td><PaymentBadge status={o.paymentStatus} /></td>
                  <td className="text-right tabular-nums">{formatMoney(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
