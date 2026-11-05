"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, availablePaymentMethods } from "@/lib/settings";
import { quoteCart, nextOrderNumber, confirmCodOrder, markOrderPaid, markPaymentFailed, sendOrderEmail, type Quote } from "@/lib/orders";
import { addressSchema, fieldErrors } from "@/lib/address";
import { createRazorpayOrder, razorpayKeyId, verifyRazorpaySignature, fetchRazorpayOrderPayments } from "@/lib/payments/razorpay";
import { createCashfreeOrder, cashfreeMode } from "@/lib/payments/cashfree";
import { siteUrl } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { canAccessOrder, rememberGuestOrder } from "@/lib/guest-orders";
import type { PaymentMethod } from "@prisma/client";

const lineSchema = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(99),
  selections: z.array(z.object({ groupId: z.string().max(64), valueId: z.string().max(64) })).max(12).default([]),
  personalization: z.string().max(300).nullish(),
});
const methodSchema = z.enum(["RAZORPAY", "CASHFREE", "COD"]);

export type GatewayLaunch =
  | { kind: "cod"; number: string }
  | { kind: "razorpay"; number: string; keyId: string; razorpayOrderId: string; amount: number; storeName: string; prefill: { name: string; email: string; contact: string } }
  | { kind: "cashfree"; number: string; paymentSessionId: string; mode: "sandbox" | "production" };

export type PlaceOrderResult = { ok: true; launch: GatewayLaunch } | { ok: false; error: string; fieldErrors?: Record<string, string>; quote?: Quote };

export async function quoteAction(input: { lines: unknown; couponCode?: string | null; giftWrap?: boolean; paymentMethod?: string | null }): Promise<Quote> {
  const lines = z.array(lineSchema).max(50).safeParse(input.lines);
  const user = await getCurrentUser();
  const method = methodSchema.safeParse(input.paymentMethod);
  return quoteCart({
    lines: lines.success ? lines.data : [],
    couponCode: typeof input.couponCode === "string" ? input.couponCode.slice(0, 40) : null,
    giftWrap: Boolean(input.giftWrap),
    paymentMethod: method.success ? method.data : null,
    userId: user?.id ?? null,
  });
}

const placeSchema = z.object({
  lines: z.array(lineSchema).min(1, "Your bag is empty").max(50),
  couponCode: z.string().max(40).nullish(),
  giftWrap: z.boolean().default(false),
  isGift: z.boolean().default(false),
  giftMessage: z.string().max(200, "Gift message is limited to 200 characters").nullish(),
  notes: z.string().max(500).nullish(),
  paymentMethod: methodSchema,
  addressId: z.string().nullish(),
  address: z.unknown().optional(),
  saveAddress: z.boolean().default(true),
  phone: z.string().max(20).nullish(),
  /** Guests only: the email the order and updates go to */
  email: z.string().max(160).nullish(),
});

async function launchGateway(order: { id: string; number: string; total: number; paymentMethod: PaymentMethod; email: string; shippingAddress: unknown }, user: { id: string; name: string; email: string; phone: string | null }): Promise<GatewayLaunch> {
  const s = await getSettings();
  const addr = order.shippingAddress as { phone?: string; name?: string };
  const phone = (addr?.phone || user.phone || "").replace(/\D/g, "").slice(-10);
  if (order.paymentMethod === "RAZORPAY") {
    const rp = await createRazorpayOrder({ amount: order.total, receipt: order.number, notes: { orderNumber: order.number } });
    await db.order.update({ where: { id: order.id }, data: { gatewayOrderId: rp.id, paymentStatus: "PENDING" } });
    return { kind: "razorpay", number: order.number, keyId: razorpayKeyId(), razorpayOrderId: rp.id, amount: order.total, storeName: s.store.name, prefill: { name: addr?.name || user.name, email: order.email, contact: phone } };
  }
  if (order.paymentMethod === "CASHFREE") {
    const gatewayOrderId = `${order.number}_${Date.now().toString(36)}`;
    const cf = await createCashfreeOrder({
      gatewayOrderId,
      amount: order.total,
      customer: { id: user.id, name: addr?.name || user.name, email: order.email, phone },
      returnUrl: siteUrl(`/checkout/return?order=${order.number}`),
      notifyUrl: siteUrl("/api/webhooks/cashfree"),
      note: `Order ${order.number}`,
    });
    await db.order.update({ where: { id: order.id }, data: { gatewayOrderId, paymentStatus: "PENDING" } });
    return { kind: "cashfree", number: order.number, paymentSessionId: cf.payment_session_id, mode: cashfreeMode() };
  }
  return { kind: "cod", number: order.number };
}

export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  const signedIn = await getCurrentUser();
  const ip = await clientIp();
  const rl = rateLimit(signedIn ? `place:${signedIn.id}` : `place-guest:${ip}`, 8, 60_000);
  if (!rl.ok) return { ok: false, error: `Too many attempts. Try again in ${rl.retryAfter}s` };

  const parsed = placeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details", fieldErrors: fieldErrors(parsed.error) };
  const input = parsed.data;

  // Who owns the order. Signed-in: the account. Guest: the record for that email (created if new, no password),
  // so the order shows up when the owner of that email later signs in or claims it. Guests never get that account's data.
  const isGuest = !signedIn;
  let user: { id: string; name: string; email: string; phone: string | null };
  if (signedIn) {
    user = signedIn;
  } else {
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!z.email().safeParse(email).success) return { ok: false, error: "Enter a valid email address for your order updates", fieldErrors: { email: "Enter a valid email address" } };
    const nm = String((input.address as { name?: string } | undefined)?.name ?? "").trim().slice(0, 80) || "Customer";
    const rec = await db.user.upsert({ where: { email }, create: { email, name: nm }, update: {}, select: { id: true, name: true, email: true, phone: true } });
    user = rec;
  }
  const s = await getSettings();
  const methods = availablePaymentMethods(s);
  if (!methods.includes(input.paymentMethod)) return { ok: false, error: "That payment method is not available right now" };

  // Address: saved (must be owned) or new
  let address;
  if (input.addressId && !isGuest) {
    const a = await db.address.findFirst({ where: { id: input.addressId, userId: user.id } });
    if (!a) return { ok: false, error: "Please choose a delivery address" };
    address = { name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode, country: a.country };
  } else {
    const a = addressSchema.safeParse(input.address);
    if (!a.success) return { ok: false, error: "Please check the delivery address", fieldErrors: Object.fromEntries(Object.entries(fieldErrors(a.error)).map(([k, v]) => [`address.${k}`, v])) };
    address = a.data;
  }

  const quote = await quoteCart({ lines: input.lines, couponCode: input.couponCode, giftWrap: input.giftWrap, paymentMethod: input.paymentMethod, userId: isGuest ? null : user.id, settings: s });
  if (quote.hasErrors) return { ok: false, error: "Some items in your bag need attention", quote };
  const valid = quote.lines.filter((l) => !l.error);
  if (valid.length === 0) return { ok: false, error: "Your bag is empty", quote };
  if (input.couponCode && quote.couponError) return { ok: false, error: quote.couponError, quote };
  if (input.paymentMethod !== "COD" && quote.total < 100) return { ok: false, error: "Order total is too low for online payment", quote };
  if (input.paymentMethod === "COD" && s.commerce.codMaxOrder > 0 && quote.total - quote.codFee > s.commerce.codMaxOrder) return { ok: false, error: "Cash on Delivery is not available for this order value. Please pay online.", quote };

  const order = await db.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx);
    if (!isGuest && !input.addressId && input.saveAddress) {
      const count = await tx.address.count({ where: { userId: user.id } });
      if (count < 10) await tx.address.create({ data: { ...address, userId: user.id, isDefault: count === 0 } });
    }
    if (!isGuest && input.phone && !user.phone) {
      const p = input.phone.replace(/\D/g, "").slice(-10);
      if (/^[6-9]\d{9}$/.test(p) && !(await tx.user.findFirst({ where: { phone: p }, select: { id: true } }))) await tx.user.update({ where: { id: user.id }, data: { phone: p } });
    }
    const created = await tx.order.create({
      data: {
        number,
        userId: user.id,
        isGuest,
        email: user.email,
        paymentMethod: input.paymentMethod,
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        subtotal: quote.subtotal,
        discount: quote.discount,
        memberDiscount: quote.memberDiscount,
        memberTier: quote.memberTier,
        shipping: quote.shipping,
        giftWrap: quote.giftWrap,
        codFee: quote.codFee,
        total: quote.total,
        couponCode: quote.couponCode,
        isGift: input.isGift || input.giftWrap,
        giftMessage: input.giftMessage?.trim() || null,
        notes: input.notes?.trim() || null,
        shippingAddress: address as object,
        estimatedDelivery: new Date(Date.now() + (s.commerce.dispatchDays + s.commerce.deliveryDaysMax) * 86400000),
        items: {
          create: [...valid, ...quote.giftLines].map((l) => ({ productId: l.productId, name: l.name, slug: l.slug, image: l.image, unitPrice: l.unitPrice, quantity: l.quantity, selections: l.selections as object, personalization: l.personalization, lineTotal: l.lineTotal })),
        },
        events: { create: { status: "PENDING_PAYMENT", note: input.paymentMethod === "COD" ? "Order received." : "Order created. Waiting for payment.", isPublic: input.paymentMethod !== "COD" } },
      },
    });
    if (input.paymentMethod === "COD") await confirmCodOrder(tx, created.id);
    return created;
  });

  if (isGuest) await rememberGuestOrder(order.number);
  if (input.paymentMethod === "COD") {
    await sendOrderEmail(order.id, "confirmed").catch(() => {});
    return { ok: true, launch: { kind: "cod", number: order.number } };
  }
  try {
    const launch = await launchGateway(order, { id: user.id, name: (address as { name?: string }).name || user.name, email: user.email, phone: user.phone });
    return { ok: true, launch };
  } catch (err) {
    console.error("[checkout] gateway launch failed", err);
    return { ok: false, error: `${(err as Error).message || "Payment could not be started"}. Your order ${order.number} is saved — you can pay from My orders.` };
  }
}

export async function verifyRazorpayPayment(input: { number: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  const order = await db.order.findUnique({ where: { number: String(input.number) } });
  if (!order || !(await canAccessOrder(order, user))) return { ok: false, error: "Order not found" };
  if (order.paymentStatus === "PAID") return { ok: true };
  if (order.paymentMethod !== "RAZORPAY" || order.gatewayOrderId !== input.razorpay_order_id) return { ok: false, error: "Payment does not match this order" };
  if (!verifyRazorpaySignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) return { ok: false, error: "Payment could not be verified" };
  await markOrderPaid(order.id, input.razorpay_payment_id, "razorpay-callback");
  return { ok: true };
}

/** Called when the Razorpay modal is closed without paying or a payment fails client-side. */
export async function reportPaymentFailure(number: string, reason: string) {
  const user = await getCurrentUser();
  const order = await db.order.findUnique({ where: { number: String(number) } });
  if (!order || !(await canAccessOrder(order, user))) return;
  // If the gateway actually captured (race), finalize instead of failing
  if (order.paymentMethod === "RAZORPAY" && order.gatewayOrderId) {
    const payments = await fetchRazorpayOrderPayments(order.gatewayOrderId).catch(() => []);
    const captured = payments.find((p) => p.status === "captured" && p.amount === order.total);
    if (captured) { await markOrderPaid(order.id, captured.id, "razorpay-reconcile"); return; }
  }
  await markPaymentFailed(order.id, String(reason).slice(0, 200));
}

export async function retryPayment(number: string, method?: string): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  const rl = rateLimit(`retry:${user?.id ?? await clientIp()}`, 8, 60_000);
  if (!rl.ok) return { ok: false, error: `Too many attempts. Try again in ${rl.retryAfter}s` };
  const order = await db.order.findUnique({ where: { number: String(number) }, include: { items: { include: { product: { select: { status: true } } } } } });
  if (!order || !(await canAccessOrder(order, user))) return { ok: false, error: "Order not found" };
  if (order.paymentStatus === "PAID") return { ok: false, error: "This order is already paid" };
  if (order.status !== "PENDING_PAYMENT") return { ok: false, error: "This order can no longer be paid" };
  if (order.items.some((i) => !i.product || i.product.status !== "ACTIVE")) return { ok: false, error: "An item in this order is no longer available. Please cancel and place a new order." };
  const s = await getSettings();
  const methods = availablePaymentMethods(s).filter((m) => m !== "COD");
  let chosen = order.paymentMethod;
  const m = methodSchema.safeParse(method);
  if (m.success && m.data !== "COD" && methods.includes(m.data)) chosen = m.data;
  if (!methods.includes(chosen as "RAZORPAY" | "CASHFREE")) {
    if (!methods.length) return { ok: false, error: "Online payment is not available right now" };
    chosen = methods[0];
  }
  if (chosen !== order.paymentMethod) await db.order.update({ where: { id: order.id }, data: { paymentMethod: chosen } });
  try {
    return { ok: true, launch: await launchGateway({ ...order, paymentMethod: chosen }, { id: order.userId, name: ((order.shippingAddress as { name?: string } | null)?.name) || "Customer", email: order.email, phone: null }) };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Payment could not be started" };
  }
}

