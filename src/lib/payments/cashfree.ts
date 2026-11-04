import "server-only";
import crypto from "node:crypto";

const API_VERSION = "2023-08-01";

function cfg() {
  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secret) throw new Error("Cashfree is not configured");
  const sandbox = process.env.CASHFREE_ENV === "sandbox";
  return { appId, secret, sandbox, base: sandbox ? "https://sandbox.cashfree.com/pg" : "https://api.cashfree.com/pg" };
}

export function cashfreeMode(): "sandbox" | "production" {
  return process.env.CASHFREE_ENV === "sandbox" ? "sandbox" : "production";
}

function headers() {
  const c = cfg();
  return { "x-client-id": c.appId, "x-client-secret": c.secret, "x-api-version": API_VERSION, "Content-Type": "application/json", Accept: "application/json" };
}

export async function createCashfreeOrder(input: {
  gatewayOrderId: string;
  amount: number; // paise
  customer: { id: string; name: string; email: string; phone: string };
  returnUrl: string;
  notifyUrl: string;
  note?: string;
}) {
  const c = cfg();
  const phone = input.customer.phone.replace(/\D/g, "").slice(-10);
  const res = await fetch(`${c.base}/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      order_id: input.gatewayOrderId,
      order_amount: Number((input.amount / 100).toFixed(2)),
      order_currency: "INR",
      customer_details: {
        customer_id: input.customer.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50) || "guest",
        customer_name: input.customer.name.slice(0, 100),
        customer_email: input.customer.email,
        customer_phone: phone,
      },
      order_meta: { return_url: input.returnUrl, notify_url: input.notifyUrl },
      order_note: input.note?.slice(0, 200),
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.payment_session_id) {
    console.error("[cashfree] create order failed", res.status, data);
    throw new Error(data?.message || "Could not start Cashfree payment");
  }
  return data as { cf_order_id: string; order_id: string; payment_session_id: string; order_status: string };
}

export async function getCashfreeOrder(gatewayOrderId: string) {
  const c = cfg();
  const res = await fetch(`${c.base}/orders/${encodeURIComponent(gatewayOrderId)}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as { order_id: string; order_status: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | "TERMINATION_REQUESTED"; order_amount: number; cf_order_id: string };
}

export async function getCashfreePayments(gatewayOrderId: string) {
  const c = cfg();
  const res = await fetch(`${c.base}/orders/${encodeURIComponent(gatewayOrderId)}/payments`, { headers: headers(), cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()) as { cf_payment_id: string | number; payment_status: string; payment_amount: number }[];
}

/** Cashfree webhook signature: base64(HMAC_SHA256(timestamp + rawBody, secretKey)) */
export function verifyCashfreeWebhook(rawBody: string, signature: string | null, timestamp: string | null) {
  if (!signature || !timestamp) return false;
  const { secret } = cfg();
  const expected = crypto.createHmac("sha256", secret).update(timestamp + rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
