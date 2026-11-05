import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canAccessOrder } from "@/lib/guest-orders";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCashfreeOrder, getCashfreePayments } from "@/lib/payments/cashfree";
import { markOrderPaid, markPaymentFailed } from "@/lib/orders";
import { PayNowButton } from "@/components/checkout/pay-now-button";

export const metadata: Metadata = { title: "Payment status", robots: { index: false } };

export default async function CashfreeReturn({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: number } = await searchParams;
  const user = await getCurrentUser();
  if (!number) redirect("/shop");
  const order = await db.order.findUnique({ where: { number: String(number) } });
  if (!order || !(await canAccessOrder(order, user))) redirect(user ? "/account/orders" : "/track");
  const ownGuest = !user || order.userId !== user.id;

  let status = order.paymentStatus;
  if (status !== "PAID" && order.paymentMethod === "CASHFREE" && order.gatewayOrderId) {
    try {
      const cf = await getCashfreeOrder(order.gatewayOrderId);
      if (cf?.order_status === "PAID" && Math.round(cf.order_amount * 100) === order.total) {
        const payments = await getCashfreePayments(order.gatewayOrderId).catch(() => []);
        const ok = payments.find((p) => p.payment_status === "SUCCESS");
        await markOrderPaid(order.id, ok ? String(ok.cf_payment_id) : null, "cashfree-return");
        status = "PAID";
      } else if (cf && cf.order_status !== "PAID") {
        const payments = await getCashfreePayments(order.gatewayOrderId).catch(() => []);
        if (payments.length && payments.every((p) => p.payment_status === "FAILED" || p.payment_status === "USER_DROPPED" || p.payment_status === "CANCELLED")) {
          await markPaymentFailed(order.id, "Cashfree payment not completed");
        }
      }
    } catch (e) {
      console.error("[cashfree-return]", e);
    }
  }
  if (status === "PAID") redirect(`/order/${order.number}`);

  const s = await getSettings();
  return (
    <div className="container-x py-16 md:py-24">
      <div className="max-w-2xl space-y-5">
        <h1 className="text-5xl md:text-6xl">Payment not completed</h1>
        <p className="text-lg">We did not receive the payment for order <b className="tabular-nums">{order.number}</b>. Nothing has been charged — or if money left your account, it will be confirmed here automatically within a few minutes, or refunded by your bank.</p>
        <div className="flex flex-wrap gap-3">
          <PayNowButton number={order.number} accent={s.theme.colors.accent} label="Try again" />
          <Link href={ownGuest ? `/track?order=${order.number}&contact=${encodeURIComponent(order.email)}` : `/account/orders/${order.number}`} className="btn btn-ghost">View order</Link>
        </div>
      </div>
    </div>
  );
}
