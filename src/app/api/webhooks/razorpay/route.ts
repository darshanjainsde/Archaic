import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyRazorpayWebhook } from "@/lib/payments/razorpay";
import { markOrderPaid, markPaymentFailed } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payment = { id: string; order_id: string; amount: number; status: string; notes?: Record<string, string> | []; error_description?: string };

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyRazorpayWebhook(raw, req.headers.get("x-razorpay-signature"))) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  let body: { event?: string; payload?: { payment?: { entity?: Payment }; order?: { entity?: { id: string; amount_paid: number; notes?: Record<string, string> } } } };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true, ignored: "bad json" }); }
  const event = body.event ?? "";
  const payment = body.payload?.payment?.entity;
  const rpOrder = body.payload?.order?.entity;
  const notes = (payment?.notes && !Array.isArray(payment.notes) ? payment.notes : rpOrder?.notes) ?? {};
  const gatewayOrderId = payment?.order_id ?? rpOrder?.id;

  const order =
    (notes.orderNumber ? await db.order.findUnique({ where: { number: String(notes.orderNumber) } }) : null) ??
    (gatewayOrderId ? await db.order.findUnique({ where: { gatewayOrderId } }) : null);
  if (!order) return NextResponse.json({ ok: true, ignored: "order not found" });

  try {
    if (event === "payment.captured" || event === "order.paid") {
      const amount = event === "order.paid" ? rpOrder?.amount_paid ?? payment?.amount : payment?.amount;
      if (amount !== order.total) {
        console.error(`[webhook:razorpay] amount mismatch for ${order.number}: ${amount} != ${order.total}`);
        await db.orderEvent.create({ data: { orderId: order.id, status: order.status, note: `Razorpay amount mismatch (${amount}). Check manually.`, isPublic: false } });
        return NextResponse.json({ ok: true, ignored: "amount mismatch" });
      }
      await markOrderPaid(order.id, payment?.id ?? null, `razorpay-webhook:${event}`);
    } else if (event === "payment.failed") {
      await markPaymentFailed(order.id, payment?.error_description ?? "Payment failed");
    }
  } catch (e) {
    console.error("[webhook:razorpay]", e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
