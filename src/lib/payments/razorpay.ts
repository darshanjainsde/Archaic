import "server-only";
import crypto from "node:crypto";

const API = "https://api.razorpay.com/v1";

function auth() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay is not configured");
  return { id, secret, header: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") };
}

export function razorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

export async function createRazorpayOrder(input: { amount: number; receipt: string; notes: Record<string, string> }) {
  const { header } = auth();
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { Authorization: header, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: input.amount, currency: "INR", receipt: input.receipt.slice(0, 40), notes: input.notes, payment_capture: 1 }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) {
    console.error("[razorpay] create order failed", res.status, data);
    throw new Error(data?.error?.description || "Could not start Razorpay payment");
  }
  return data as { id: string; amount: number; currency: string };
}

export async function fetchRazorpayOrderPayments(orderId: string) {
  const { header } = auth();
  const res = await fetch(`${API}/orders/${encodeURIComponent(orderId)}/payments`, { headers: { Authorization: header }, cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []) as { id: string; status: string; amount: number; order_id: string }[];
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const { secret } = auth();
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyRazorpayWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
