import "server-only";
import { Prisma, type OrderStatus, type PaymentMethod } from "@prisma/client";
import { db } from "./db";
import { getSettings } from "./settings";
import { parseOptions, parsePersonalization, resolveLine } from "./pricing";
import { memberDiscountPct } from "./membership";
import type { Selection, SelectionSnapshot } from "./types";
import type { StoreSettings } from "./settings-schema";
import { sendEmail, emailLayout, escapeHtml } from "./email";
import { formatMoney } from "./money";
import { siteUrl } from "./utils";

export type QuoteInputLine = { productId: string; quantity: number; selections: Selection[]; personalization?: string | null };

export type QuotedLine = {
  key: string;
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  selections: SelectionSnapshot[];
  personalization: string | null;
  error: string | null;
  maxQty: number;
};

export type Milestone = { kind: "shipping" | "gift"; label: string; threshold: number; reached: boolean };
export type Quote = {
  lines: QuotedLine[];
  /** Free gifts unlocked by the order value; priced ₹0 and added to the order on the server. Not part of `lines`. */
  giftLines: QuotedLine[];
  /** Free-delivery and gift thresholds, ascending, for the progress bar */
  milestones: Milestone[];
  /** The next milestone not reached yet, with how much more is needed */
  next: { label: string; remaining: number; kind: "shipping" | "gift" } | null;
  /** Order value the milestones are measured against (after discounts) */
  progressValue: number;
  subtotal: number;
  memberDiscount: number;
  memberTier: string | null;
  memberPct: number;
  discount: number;
  couponCode: string | null;
  couponError: string | null;
  shipping: number;
  giftWrap: number;
  codFee: number;
  total: number;
  freeShippingRemaining: number;
  hasErrors: boolean;
};

/** Statuses that count towards lifetime spend for membership. */
const SPEND_EXCLUDED: OrderStatus[] = ["PENDING_PAYMENT", "CANCELLED", "RETURNED", "REFUNDED"];

export async function lifetimeSpend(userId: string): Promise<number> {
  const agg = await db.order.aggregate({
    where: { userId, status: { notIn: SPEND_EXCLUDED }, OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }] },
    _sum: { total: true },
  });
  return agg._sum.total ?? 0;
}

async function evaluateCoupon(code: string, amount: number, userId: string | null) {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  if (!coupon || !coupon.isActive) return { error: "This code is not valid", discount: 0, code: null };
  if (coupon.startsAt && coupon.startsAt > now) return { error: "This code is not active yet", discount: 0, code: null };
  if (coupon.expiresAt && coupon.expiresAt < now) return { error: "This code has expired", discount: 0, code: null };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return { error: "This code has been fully used", discount: 0, code: null };
  if (amount < coupon.minOrder) return { error: `Add ${formatMoney(coupon.minOrder - amount)} more to use this code`, discount: 0, code: null };
  if (userId && coupon.perUserLimit) {
    const used = await db.order.count({ where: { userId, couponCode: coupon.code, status: { notIn: ["CANCELLED", "PENDING_PAYMENT"] } } });
    if (used >= coupon.perUserLimit) return { error: "You have already used this code", discount: 0, code: null };
  }
  let discount = coupon.type === "PERCENT" ? Math.round((amount * Math.min(100, coupon.value)) / 100) : coupon.value;
  if (coupon.type === "PERCENT" && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.max(0, Math.min(discount, amount));
  return { error: null, discount, code: coupon.code };
}

/** Authoritative price computation from the database. Never trusts client prices. */
export async function quoteCart(input: {
  lines: QuoteInputLine[];
  couponCode?: string | null;
  giftWrap?: boolean;
  paymentMethod?: PaymentMethod | null;
  userId?: string | null;
  settings?: StoreSettings;
}): Promise<Quote> {
  const s = input.settings ?? (await getSettings());
  const rawLines = (input.lines ?? []).slice(0, 50);
  const ids = [...new Set(rawLines.map((l) => String(l.productId)))];
  const products = ids.length
    ? await db.product.findMany({ where: { id: { in: ids } }, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } })
    : [];
  const map = new Map(products.map((p) => [p.id, p]));

  const lines: QuotedLine[] = [];
  const qtyByProduct = new Map<string, number>();
  for (const l of rawLines) {
    const p = map.get(String(l.productId));
    const qty = Math.max(1, Math.min(s.commerce.maxQtyPerLine, Math.trunc(Number(l.quantity) || 1)));
    if (!p || p.status !== "ACTIVE") {
      lines.push({ key: String(l.productId), productId: String(l.productId), name: p?.name ?? "Unavailable item", slug: p?.slug ?? "", image: p?.images[0]?.url ?? null, unitPrice: 0, quantity: qty, lineTotal: 0, selections: [], personalization: null, error: "This item is no longer available", maxQty: 0 });
      continue;
    }
    const r = resolveLine(p.price, parseOptions(p.options), l.selections ?? [], parsePersonalization(p.personalization), l.personalization);
    const totalForProduct = (qtyByProduct.get(p.id) ?? 0) + qty;
    qtyByProduct.set(p.id, totalForProduct);
    const maxQty = p.trackInventory ? Math.max(0, p.stock) : s.commerce.maxQtyPerLine;
    let error: string | null = r.ok ? null : r.error;
    if (!error && p.trackInventory && totalForProduct > p.stock) error = p.stock <= 0 ? "Out of stock" : `Only ${p.stock} left in stock`;
    const unit = r.ok ? r.unitPrice : p.price;
    lines.push({
      key: `${p.id}:${lines.length}`,
      productId: p.id,
      name: p.name,
      slug: p.slug,
      image: (r.ok && r.optionImage) || p.images[0]?.url || null,
      unitPrice: unit,
      quantity: qty,
      lineTotal: unit * qty,
      selections: r.ok ? r.snapshot : [],
      personalization: r.ok ? r.personalization : null,
      error,
      maxQty,
    });
  }

  const valid = lines.filter((l) => !l.error);
  const subtotal = valid.reduce((a, l) => a + l.lineTotal, 0);

  let memberPct = 0;
  let memberTier: string | null = null;
  if (input.userId) {
    const spend = await lifetimeSpend(input.userId);
    const m = memberDiscountPct(s, spend);
    memberPct = m.pct;
    memberTier = m.tier;
  }
  const memberDiscount = Math.round((subtotal * memberPct) / 100);
  const afterMember = subtotal - memberDiscount;

  let discount = 0;
  let couponCode: string | null = null;
  let couponError: string | null = null;
  if (input.couponCode && input.couponCode.trim()) {
    const c = await evaluateCoupon(input.couponCode, afterMember, input.userId ?? null);
    discount = c.discount;
    couponCode = c.code;
    couponError = c.error;
  }
  const afterDiscount = Math.max(0, afterMember - discount);
  const threshold = s.commerce.freeShippingThreshold;
  const shipping = valid.length === 0 ? 0 : threshold === 0 || afterDiscount >= threshold ? 0 : s.commerce.flatShipping;
  const freeShippingRemaining = threshold > 0 && afterDiscount < threshold ? threshold - afterDiscount : 0;
  const tierFreeWrap = memberPct > 0; // paid tiers include free gift wrap
  const giftWrap = input.giftWrap && s.commerce.giftWrapEnabled && valid.length ? (tierFreeWrap ? 0 : s.commerce.giftWrapPrice) : 0;
  const codFee = input.paymentMethod === "COD" && valid.length ? s.commerce.codFee : 0;
  const total = afterDiscount + shipping + giftWrap + codFee;

  // ---- milestones: free delivery + free gifts ----
  const milestones: Milestone[] = [];
  if (threshold > 0 && s.commerce.flatShipping > 0) milestones.push({ kind: "shipping", label: "Free delivery", threshold, reached: afterDiscount >= threshold });
  const gifts = (s.commerce.freeGifts ?? []).filter((g) => g.enabled && g.productSlug && g.threshold > 0).sort((a, b) => a.threshold - b.threshold);
  const giftProducts = gifts.length && valid.length
    ? await db.product.findMany({ where: { slug: { in: gifts.map((g) => g.productSlug) }, status: "ACTIVE" }, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } })
    : [];
  const giftLines: QuotedLine[] = [];
  for (const g of gifts) {
    const gp = giftProducts.find((x) => x.slug === g.productSlug);
    if (!gp || (gp.trackInventory && gp.stock <= 0)) continue; // out of stock gifts are simply not offered
    const reached = afterDiscount >= g.threshold;
    milestones.push({ kind: "gift", label: g.label || `Free ${gp.name}`, threshold: g.threshold, reached });
    if (reached) giftLines.push({ key: `gift:${gp.id}`, productId: gp.id, name: `${gp.name} (free gift)`, slug: gp.slug, image: gp.images[0]?.url ?? null, unitPrice: 0, quantity: 1, lineTotal: 0, selections: [], personalization: null, error: null, maxQty: 1 });
  }
  milestones.sort((a, b) => a.threshold - b.threshold);
  const upcoming = valid.length ? milestones.find((m) => !m.reached) : undefined;
  const next = upcoming ? { label: upcoming.label, remaining: upcoming.threshold - afterDiscount, kind: upcoming.kind } : null;

  return { lines, giftLines, milestones, next, progressValue: afterDiscount, subtotal, memberDiscount, memberTier, memberPct, discount, couponCode, couponError, shipping, giftWrap, codFee, total, freeShippingRemaining, hasErrors: lines.some((l) => l.error) };
}

export async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const c = await tx.orderCounter.upsert({ where: { id: "orders" }, create: { id: "orders", value: 10001 }, update: { value: { increment: 1 } } });
  return `AC${c.value}`;
}

/** Decrement stock + bump coupon usage & sold counts exactly once per order. */
async function applyStock(tx: Prisma.TransactionClient, orderId: string) {
  const claimed = await tx.order.updateMany({ where: { id: orderId, stockApplied: false }, data: { stockApplied: true } });
  if (claimed.count === 0) return;
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  for (const it of order.items) {
    if (!it.productId) continue;
    const p = await tx.product.findUnique({ where: { id: it.productId }, select: { trackInventory: true, stock: true } });
    if (!p) continue;
    await tx.product.update({
      where: { id: it.productId },
      data: { soldCount: { increment: it.quantity }, ...(p.trackInventory ? { stock: Math.max(0, p.stock - it.quantity) } : {}) },
    });
  }
  if (order.couponCode) await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
}

async function restoreStock(tx: Prisma.TransactionClient, orderId: string) {
  const claimed = await tx.order.updateMany({ where: { id: orderId, stockApplied: true }, data: { stockApplied: false } });
  if (claimed.count === 0) return;
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  for (const it of order.items) {
    if (!it.productId) continue;
    const p = await tx.product.findUnique({ where: { id: it.productId }, select: { trackInventory: true } });
    if (!p) continue;
    await tx.product.update({
      where: { id: it.productId },
      data: { soldCount: { decrement: it.quantity }, ...(p.trackInventory ? { stock: { increment: it.quantity } } : {}) },
    });
  }
  if (order.couponCode) await tx.coupon.updateMany({ where: { code: order.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
}

/** Mark an online-paid order as paid. Idempotent: safe to call from the browser callback AND the webhook. */
export async function markOrderPaid(orderId: string, gatewayPaymentId: string | null, source: string) {
  const changed = await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: { in: ["PENDING", "FAILED"] } },
      data: { paymentStatus: "PAID", paidAt: new Date(), gatewayPaymentId: gatewayPaymentId ?? undefined },
    });
    if (res.count === 0) return false;
    const o = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (o.status === "PENDING_PAYMENT") {
      await tx.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
      await tx.orderEvent.create({ data: { orderId, status: "CONFIRMED", note: "Payment received. Your order is confirmed." } });
      await applyStock(tx, orderId);
    } else if (o.status === "CANCELLED") {
      // Payment arrived after the order was cancelled: keep cancelled and flag for refund.
      await tx.orderEvent.create({ data: { orderId, status: "CANCELLED", note: `Payment ${gatewayPaymentId ?? ""} received after cancellation — refund required.`, isPublic: false } });
      await tx.order.update({ where: { id: orderId }, data: { adminNote: "Payment received after cancellation — refund required" } });
    }
    console.info(`[orders] ${o.number} marked paid via ${source}`);
    return true;
  });
  if (changed) await sendOrderEmail(orderId, "confirmed").catch(() => {});
  return changed;
}

export async function markPaymentFailed(orderId: string, reason?: string) {
  await db.order.updateMany({ where: { id: orderId, paymentStatus: "PENDING" }, data: { paymentStatus: "FAILED" } });
  if (reason) await db.orderEvent.create({ data: { orderId, status: "PENDING_PAYMENT", note: `Payment attempt failed: ${reason}`.slice(0, 300), isPublic: false } });
}

export async function confirmCodOrder(tx: Prisma.TransactionClient, orderId: string) {
  await tx.order.update({ where: { id: orderId }, data: { status: "CONFIRMED", paymentStatus: "COD_PENDING" } });
  await tx.orderEvent.create({ data: { orderId, status: "CONFIRMED", note: "Order placed with Cash on Delivery." } });
  await applyStock(tx, orderId);
}

export const STATUS_FLOW: OrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Being prepared",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
};

export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"];

/** Change order status (admin or customer). Handles stock restore and the timeline. */
export async function changeOrderStatus(orderId: string, status: OrderStatus, opts: { note?: string | null; isPublic?: boolean; actor: "admin" | "customer" | "system"; tracking?: { courier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null } }) {
  const result = await db.$transaction(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (o.status === status && !opts.tracking) return o;
    const data: Prisma.OrderUpdateInput = { status };
    if (opts.tracking) {
      if (opts.tracking.courier !== undefined) data.courier = opts.tracking.courier || null;
      if (opts.tracking.trackingNumber !== undefined) data.trackingNumber = opts.tracking.trackingNumber || null;
      if (opts.tracking.trackingUrl !== undefined) data.trackingUrl = opts.tracking.trackingUrl || null;
    }
    if (status === "DELIVERED" && o.paymentMethod === "COD" && o.paymentStatus === "COD_PENDING") data.paymentStatus = "PAID";
    if (status === "DELIVERED" && !o.paidAt && o.paymentMethod === "COD") data.paidAt = new Date();
    if (status === "REFUNDED") data.paymentStatus = "REFUNDED";
    const updated = await tx.order.update({ where: { id: orderId }, data });
    if (["CANCELLED", "RETURNED", "REFUNDED"].includes(status)) await restoreStock(tx, orderId);
    // Re-activating a cancelled order (admin) re-applies stock
    if (o.status === "CANCELLED" && !["CANCELLED", "RETURNED", "REFUNDED", "PENDING_PAYMENT"].includes(status)) await applyStock(tx, orderId);
    if (o.status !== status) {
      const defaultNote =
        status === "CANCELLED" && opts.actor === "customer" ? "Cancelled by you." + (o.paymentStatus === "PAID" ? " Your refund will be processed to the original payment method in 5–7 working days." : "") : null;
      await tx.orderEvent.create({ data: { orderId, status, note: opts.note || defaultNote, isPublic: opts.isPublic ?? true } });
    }
    return updated;
  });
  if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED"].includes(status)) await sendOrderEmail(orderId, "status").catch(() => {});
  return result;
}

export async function sendOrderEmail(orderId: string, kind: "confirmed" | "status") {
  const o = await db.order.findUnique({ where: { id: orderId }, include: { items: true, user: { select: { name: true } } } });
  if (!o) return;
  const link = siteUrl(`/account/orders/${o.number}`);
  const rows = o.items
    .map((i) => `<tr><td style="padding:6px 0">${escapeHtml(i.name)} × ${i.quantity}<br><span style="color:#6b5d4c;font-size:13px">${(i.selections as SelectionSnapshot[]).map((s) => `${escapeHtml(s.group)}: ${escapeHtml(s.value)}`).join(" · ")}</span></td><td style="text-align:right">${formatMoney(i.lineTotal)}</td></tr>`)
    .join("");
  if (kind === "confirmed") {
    await sendEmail({
      to: o.email,
      subject: `Order ${o.number} confirmed`,
      html: emailLayout(`Thank you, ${o.user.name.split(" ")[0]}`, `<p>Your order <b>${o.number}</b> is confirmed. We will let you know when it ships.</p><table style="width:100%;border-collapse:collapse">${rows}<tr><td style="padding-top:12px"><b>Total</b></td><td style="text-align:right;padding-top:12px"><b>${formatMoney(o.total)}</b></td></tr></table><p><a href="${link}" style="color:#2b2216">Track your order</a></p>`),
    });
  } else {
    const tracking = o.trackingNumber ? `<p>Courier: ${escapeHtml(o.courier ?? "")} · Tracking number: <b>${escapeHtml(o.trackingNumber)}</b>${o.trackingUrl ? ` · <a href="${escapeHtml(o.trackingUrl)}">Track shipment</a>` : ""}</p>` : "";
    await sendEmail({
      to: o.email,
      subject: `Order ${o.number}: ${STATUS_LABEL[o.status]}`,
      html: emailLayout(`Your order is ${STATUS_LABEL[o.status].toLowerCase()}`, `<p>Order <b>${o.number}</b> is now <b>${STATUS_LABEL[o.status]}</b>.</p>${tracking}<p><a href="${link}" style="color:#2b2216">View order details</a></p>`),
    });
  }
}
