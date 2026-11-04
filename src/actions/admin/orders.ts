"use server";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/auth";
import { changeOrderStatus, markOrderPaid } from "@/lib/orders";
import { ADMIN_TRANSITIONS } from "@/lib/order-transitions";
import { fstr, fbool, fdate } from "@/lib/form-data";
import { getCashfreeOrder, getCashfreePayments } from "@/lib/payments/cashfree";
import { fetchRazorpayOrderPayments } from "@/lib/payments/razorpay";
import { gatewayConfig } from "@/lib/settings";
import type { ActionResult } from "@/lib/admin-types";

type R = ActionResult<{ redirect?: string }>;
const STATUSES = Object.keys(ADMIN_TRANSITIONS) as OrderStatus[];

function refresh(id: string) {
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function updateOrderStatus(_: R | null, fd: FormData): Promise<R> {
  await assertAdmin();
  const id = fstr(fd, "id");
  const status = fstr(fd, "status") as OrderStatus;
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return { ok: false, error: "Order not found" };
  const trackingUrl = fstr(fd, "trackingUrl");
  if (trackingUrl && !/^https?:\/\//.test(trackingUrl)) return { ok: false, error: "Tracking link must start with https://" };
  const tracking = { courier: fstr(fd, "courier"), trackingNumber: fstr(fd, "trackingNumber"), trackingUrl };
  const sameStatus = !status || status === order.status;
  if (!sameStatus) {
    if (!STATUSES.includes(status) || !ADMIN_TRANSITIONS[order.status].includes(status)) return { ok: false, error: `Cannot move an order from ${order.status} to ${status}` };
    if (status === "SHIPPED" && !tracking.trackingNumber && !order.trackingNumber && !fbool(fd, "skipTracking")) return { ok: false, error: "Add a tracking number (or tick “ship without tracking”)" };
    if (status === "REFUNDED" && order.paymentStatus !== "PAID") return { ok: false, error: "Only paid orders can be marked refunded" };
  }
  const eta = fdate(fd, "estimatedDelivery");
  const note = fstr(fd, "note").slice(0, 1000) || null;
  await changeOrderStatus(id, sameStatus ? order.status : status, { note, isPublic: !fbool(fd, "private"), actor: "admin", tracking });
  if (sameStatus && note) await db.orderEvent.create({ data: { orderId: id, status: order.status, note, isPublic: !fbool(fd, "private") } });
  if (fstr(fd, "estimatedDelivery") || order.estimatedDelivery) await db.order.update({ where: { id }, data: { estimatedDelivery: eta } });
  refresh(id);
  return { ok: true, message: sameStatus ? "Order updated" : `Marked ${status.replace(/_/g, " ").toLowerCase()}` };
}

export async function addOrderNote(_: R | null, fd: FormData): Promise<R> {
  await assertAdmin();
  const id = fstr(fd, "id");
  const note = fstr(fd, "note").slice(0, 1000);
  if (!note) return { ok: false, error: "Write a note first" };
  const o = await db.order.findUnique({ where: { id }, select: { status: true } });
  if (!o) return { ok: false, error: "Order not found" };
  const isPublic = fbool(fd, "public");
  await db.orderEvent.create({ data: { orderId: id, status: o.status, note, isPublic } });
  refresh(id);
  return { ok: true, message: isPublic ? "Update shared with the customer" : "Private note added" };
}

export async function markRefunded(id: string): Promise<R> {
  await assertAdmin();
  const o = await db.order.findUnique({ where: { id } });
  if (!o) return { ok: false, error: "Order not found" };
  if (o.paymentStatus !== "PAID") return { ok: false, error: "This order has no captured payment to refund" };
  await changeOrderStatus(id, "REFUNDED", { actor: "admin", note: "Refund issued to the original payment method." });
  await db.order.update({ where: { id }, data: { adminNote: null } });
  refresh(id);
  return { ok: true, message: "Marked refunded. Issue the refund in your payment gateway dashboard if you haven't." };
}

/** Ask the gateway whether a pending order was actually paid (for when the webhook/redirect never arrived). */
export async function reconcilePayment(id: string): Promise<R> {
  await assertAdmin();
  const o = await db.order.findUnique({ where: { id } });
  if (!o) return { ok: false, error: "Order not found" };
  if (o.paymentStatus === "PAID") return { ok: true, message: "Already paid" };
  if (!o.gatewayOrderId) return { ok: false, error: "No payment was started for this order" };
  const g = gatewayConfig();
  try {
    if (o.paymentMethod === "CASHFREE") {
      if (!g.cashfree) return { ok: false, error: "Cashfree keys are not configured" };
      const cf = await getCashfreeOrder(o.gatewayOrderId);
      if (cf?.order_status === "PAID" && Math.round(cf.order_amount * 100) === o.total) {
        const pays = await getCashfreePayments(o.gatewayOrderId);
        const success = pays.find((p) => p.payment_status === "SUCCESS");
        await markOrderPaid(o.id, success ? String(success.cf_payment_id) : null, "admin-reconcile");
        refresh(id);
        return { ok: true, message: "Cashfree confirms payment. Order confirmed." };
      }
      return { ok: false, error: `Cashfree status: ${cf?.order_status ?? "unknown"} — not paid` };
    }
    if (o.paymentMethod === "RAZORPAY") {
      if (!g.razorpay) return { ok: false, error: "Razorpay keys are not configured" };
      const pays = await fetchRazorpayOrderPayments(o.gatewayOrderId);
      const captured = pays.find((p) => p.status === "captured" && p.amount === o.total);
      if (captured) {
        await markOrderPaid(o.id, captured.id, "admin-reconcile");
        refresh(id);
        return { ok: true, message: "Razorpay confirms payment. Order confirmed." };
      }
      return { ok: false, error: `Razorpay shows no captured payment (${pays.map((p) => p.status).join(", ") || "no attempts"})` };
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  return { ok: false, error: "Nothing to check for this payment method" };
}

/** Manually confirm payment received outside the gateway (e.g. bank transfer). */
export async function markPaidManually(id: string): Promise<R> {
  await assertAdmin();
  const o = await db.order.findUnique({ where: { id } });
  if (!o) return { ok: false, error: "Order not found" };
  if (o.paymentMethod === "COD") return { ok: false, error: "COD orders are marked paid when delivered" };
  const changed = await markOrderPaid(id, null, "admin-manual");
  if (changed) await db.orderEvent.create({ data: { orderId: id, status: "CONFIRMED", note: "Payment confirmed manually by admin.", isPublic: false } });
  refresh(id);
  return changed ? { ok: true, message: "Marked paid" } : { ok: false, error: "Order was already paid" };
}
