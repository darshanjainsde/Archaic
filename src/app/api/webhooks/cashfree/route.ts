import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCashfreeWebhook } from "@/lib/payments/cashfree";
import { markOrderPaid, markPaymentFailed } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CfBody = {
  type?: string;
  data?: {
    order?: { order_id?: string; order_amount?: number };
    payment?: { cf_payment_id?: string | number; payment_status?: string; payment_amount?: number; payment_message?: string };
  };
};

export async function POST(req: Request) {
  const raw = await req.text();
  let valid = false;
  try { valid = verifyCashfreeWebhook(raw, req.headers.get("x-webhook-signature"), req.headers.get("x-webhook-timestamp")); } catch { valid = false; }
  if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  let body: CfBody;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true, ignored: "bad json" }); }

  const gatewayOrderId = body.data?.order?.order_id;
  if (!gatewayOrderId) return NextResponse.json({ ok: true, ignored: "no order id" });
  const number = gatewayOrderId.split("_")[0];
  const order = (await db.order.findUnique({ where: { number } })) ?? (await db.order.findUnique({ where: { gatewayOrderId } }));
  if (!order) return NextResponse.json({ ok: true, ignored: "order not found" });

  try {
    const type = body.type ?? "";
    if (type === "PAYMENT_SUCCESS_WEBHOOK" || body.data?.payment?.payment_status === "SUCCESS") {
      const amount = Math.round(Number(body.data?.payment?.payment_amount ?? body.data?.order?.order_amount ?? 0) * 100);
      if (amount !== order.total) {
        console.error(`[webhook:cashfree] amount mismatch for ${order.number}: ${amount} != ${order.total}`);
        await db.orderEvent.create({ data: { orderId: order.id, status: order.status, note: `Cashfree amount mismatch (${amount}). Check manually.`, isPublic: false } });
        return NextResponse.json({ ok: true, ignored: "amount mismatch" });
      }
      await markOrderPaid(order.id, body.data?.payment?.cf_payment_id ? String(body.data.payment.cf_payment_id) : null, "cashfree-webhook");
    } else if (type === "PAYMENT_FAILED_WEBHOOK" || type === "PAYMENT_USER_DROPPED_WEBHOOK") {
      if (order.gatewayOrderId === gatewayOrderId) await markPaymentFailed(order.id, body.data?.payment?.payment_message ?? "Payment failed");
    }
  } catch (e) {
    console.error("[webhook:cashfree]", e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
