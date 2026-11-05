import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { toLocalInput } from "@/lib/form-data";
import { STATUS_LABEL } from "@/lib/orders";
import { ADMIN_TRANSITIONS } from "@/lib/order-transitions";
import type { SelectionSnapshot, ShippingAddress } from "@/lib/types";
import { Img } from "@/components/ui/img";
import { PageHeader, Panel, OrderStatusBadge, PaymentBadge, Tag } from "@/components/admin/ui";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { ActionForm, ConfirmButton } from "@/components/admin/action-form";
import { CopyButton } from "@/components/admin/copy-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { addOrderNote, markRefunded, reconcilePayment, markPaidManually } from "@/actions/admin/orders";

export const metadata = { title: "Order" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { items: true, events: { orderBy: { createdAt: "desc" } }, user: { select: { id: true, name: true, email: true, phone: true } } } });
  if (!o) notFound();
  const a = o.shippingAddress as unknown as ShippingAddress;
  const addressText = [a.name, a.line1, a.line2, a.landmark, `${a.city}, ${a.state} ${a.pincode}`, a.country, `Phone: ${a.phone}`].filter(Boolean).join("\n");
  const refundDue = o.status === "CANCELLED" && o.paymentStatus === "PAID";
  const rows: [string, number][] = [["Subtotal", o.subtotal]];
  if (o.memberDiscount) rows.push([`Member discount${o.memberTier ? ` (${o.memberTier})` : ""}`, -o.memberDiscount]);
  if (o.discount) rows.push([`Coupon ${o.couponCode ?? ""}`, -o.discount]);
  rows.push(["Shipping", o.shipping]);
  if (o.giftWrap) rows.push(["Gift wrap", o.giftWrap]);
  if (o.codFee) rows.push(["COD fee", o.codFee]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${o.number}`}
        description={`Placed ${formatDate(o.createdAt, true)}`}
        back={{ href: "/admin/orders", label: "Orders" }}
        actions={<Link className="btn btn-ghost btn-sm" href={`/admin/orders/${o.id}/packing-slip`} target="_blank">Packing slip</Link>}
      />
      <div className="flex flex-wrap items-center gap-2"><OrderStatusBadge status={o.status} /><PaymentBadge status={o.paymentStatus} /><Tag>{o.paymentMethod}</Tag>{o.isGift && <Tag tone="amber">Gift</Tag>}</div>

      {refundDue && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-[14px] text-red-950">
          <span><b>Refund due.</b> This order was cancelled after payment of {formatMoney(o.total)}. Refund it from the {o.paymentMethod === "CASHFREE" ? "Cashfree" : "Razorpay"} dashboard, then mark it refunded.</span>
          <ConfirmButton className="btn btn-ink btn-sm" confirmText="Confirm the refund has been issued?" action={markRefunded.bind(null, o.id)}>Mark refunded</ConfirmButton>
        </div>
      )}
      {o.adminNote && !refundDue && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[14px] text-amber-950">{o.adminNote}</div>}
      {o.status === "PENDING_PAYMENT" && o.paymentMethod !== "COD" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-[14px] text-amber-950">
          <span>Payment not confirmed yet. If the customer says they paid, check with the gateway.</span>
          <div className="flex gap-2">
            <ConfirmButton className="btn btn-ink btn-sm" action={reconcilePayment.bind(null, o.id)}>Check with gateway</ConfirmButton>
            <ConfirmButton className="btn btn-ghost btn-sm" confirmText="Only do this if you have received the money another way. Mark as paid?" action={markPaidManually.bind(null, o.id)}>Mark paid manually</ConfirmButton>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Panel title={`Items (${o.items.reduce((s, i) => s + i.quantity, 0)})`}>
            <ul className="divide-y divide-black/5">
              {o.items.map((it) => (
                <li key={it.id} className="flex gap-3 py-3 first:pt-0">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded bg-field"><Img src={it.image} alt="" fill sizes="64px" className="object-cover" /></div>
                  <div className="min-w-0 flex-1 text-[14px]">
                    <div className="flex justify-between gap-2"><b>{it.productId ? <Link className="hover:underline" href={`/admin/products/${it.productId}`}>{it.name}</Link> : it.name}</b><span className="tabular-nums">{formatMoney(it.lineTotal)}</span></div>
                    <div className="text-muted">{formatMoney(it.unitPrice)} × {it.quantity}</div>
                    {(it.selections as SelectionSnapshot[]).map((s) => <div key={s.group} className="flex items-center gap-1.5">{s.hex && <span className="inline-block h-3 w-3 rounded-full border border-black/10" style={{ background: s.hex }} />}{s.group}: <b>{s.value}</b></div>)}
                    {it.personalization && <div className="mt-1 rounded bg-field/70 px-2 py-1">Personalisation: <b>“{it.personalization}”</b></div>}
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-black/10 pt-3 text-[14px]">
              {rows.map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="tabular-nums">{v < 0 ? `− ${formatMoney(-v)}` : v === 0 && k === "Shipping" ? "Free" : formatMoney(v)}</dd></div>)}
              <div className="flex justify-between pt-1 text-[16px] font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(o.total)}</dd></div>
            </dl>
          </Panel>

          {(o.isGift || o.giftMessage || o.notes) && (
            <Panel title="Gift & notes">
              {o.isGift && <p className="text-[14px]">Gift wrap requested.</p>}
              {o.giftMessage && <blockquote className="mt-2 whitespace-pre-line rounded bg-field/70 p-3 text-[15px]">“{o.giftMessage}”</blockquote>}
              {o.notes && <p className="mt-2 whitespace-pre-line text-[14px]"><b>Customer note:</b> {o.notes}</p>}
            </Panel>
          )}

          <Panel title="Timeline">
            <ActionForm action={addOrderNote} className="mb-4 space-y-2" resetOnSuccess>
              <input type="hidden" name="id" value={o.id} />
              <label className="sr-only" htmlFor="pn">Add a note</label>
              <textarea id="pn" name="note" rows={2} className="field" placeholder="Add a note…" />
              <div className="flex items-center justify-between gap-2">
                <label className="check-row"><input type="checkbox" name="public" /><span className="text-[15px]">Show to customer</span></label>
                <SubmitButton variant="ink" className="btn-sm">Add note</SubmitButton>
              </div>
            </ActionForm>
            <ol className="space-y-3">
              {o.events.map((e) => (
                <li key={e.id} className="border-l-2 border-black/10 pl-3 text-[14px]">
                  <div className="flex flex-wrap items-center gap-2"><b>{STATUS_LABEL[e.status]}</b>{!e.isPublic && <Tag>Private</Tag>}<span className="text-[12px] text-muted">{formatDate(e.createdAt, true)}</span></div>
                  {e.note && <p className="whitespace-pre-line text-muted">{e.note}</p>}
                </li>
              ))}
              <li className="border-l-2 border-black/10 pl-3 text-[14px]"><b>Order created</b> <span className="text-[12px] text-muted">{formatDate(o.createdAt, true)}</span></li>
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Fulfilment">
            <OrderStatusForm
              id={o.id}
              status={o.status}
              allowed={ADMIN_TRANSITIONS[o.status].filter((s) => s !== "REFUNDED" || o.paymentStatus === "PAID")}
              paid={o.paymentStatus === "PAID"}
              tracking={{ courier: o.courier ?? "", trackingNumber: o.trackingNumber ?? "", trackingUrl: o.trackingUrl ?? "" }}
              eta={toLocalInput(o.estimatedDelivery).slice(0, 10)}
            />
          </Panel>
          <Panel title="Customer">
            <p className="text-[14px]"><Link className="font-semibold hover:underline" href={`/admin/customers/${o.user.id}`}>{o.user.name}</Link></p>
            <p className="text-[14px]">{o.email}</p>
            {o.user.phone && <p className="text-[14px]">{o.user.phone}</p>}
          </Panel>
          <Panel title="Ship to" actions={<CopyButton text={addressText} />}>
            <address className="whitespace-pre-line text-[14px] not-italic">{addressText}</address>
          </Panel>
          <Panel title="Payment">
            <dl className="space-y-1 text-[14px]">
              <div className="flex justify-between gap-2"><dt className="text-muted">Method</dt><dd>{o.paymentMethod}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Status</dt><dd><PaymentBadge status={o.paymentStatus} /></dd></div>
              {o.paidAt && <div className="flex justify-between gap-2"><dt className="text-muted">Paid</dt><dd>{formatDate(o.paidAt, true)}</dd></div>}
              {o.gatewayOrderId && <div className="flex justify-between gap-2"><dt className="text-muted">Gateway order</dt><dd className="break-all text-right">{o.gatewayOrderId}</dd></div>}
              {o.gatewayPaymentId && <div className="flex justify-between gap-2"><dt className="text-muted">Payment ID</dt><dd className="break-all text-right">{o.gatewayPaymentId}</dd></div>}
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
