"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword, createSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { addressSchema, fieldErrors } from "@/lib/address";
import { changeOrderStatus, CUSTOMER_CANCELLABLE } from "@/lib/orders";
import { passwordRule } from "@/lib/password-rule";
import { rateLimit } from "@/lib/rate-limit";
import { parseOptions } from "@/lib/pricing";
import type { CartLine, SelectionSnapshot } from "@/lib/types";
import { lineKey } from "@/lib/pricing";

export type ActionResult = { ok: boolean; error?: string; fieldErrors?: Record<string, string>; message?: string };

async function me() {
  const u = await getCurrentUser();
  if (!u) throw new Error("Please sign in");
  return u;
}

/* ---------- addresses ---------- */
export async function saveAddress(input: { id?: string | null; address: unknown; isDefault?: boolean }): Promise<ActionResult> {
  const user = await me();
  const parsed = addressSchema.safeParse(input.address);
  if (!parsed.success) return { ok: false, error: "Please check the address", fieldErrors: fieldErrors(parsed.error) };
  await db.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId: user.id } });
    const makeDefault = Boolean(input.isDefault) || count === 0;
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    if (input.id) {
      const owned = await tx.address.findFirst({ where: { id: input.id, userId: user.id } });
      if (!owned) throw new Error("Address not found");
      await tx.address.update({ where: { id: input.id }, data: { ...parsed.data, ...(makeDefault ? { isDefault: true } : {}) } });
    } else {
      if (count >= 10) throw new Error("You can save up to 10 addresses. Delete one to add another.");
      await tx.address.create({ data: { ...parsed.data, userId: user.id, isDefault: makeDefault } });
    }
  }).catch((e: Error) => { throw e; });
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function saveAddressSafe(input: { id?: string | null; address: unknown; isDefault?: boolean }): Promise<ActionResult> {
  try { return await saveAddress(input); } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const user = await me();
  const a = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!a) return { ok: false, error: "Address not found" };
  await db.address.delete({ where: { id } });
  if (a.isDefault) {
    const next = await db.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<ActionResult> {
  const user = await me();
  const a = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!a) return { ok: false, error: "Address not found" };
  await db.$transaction([
    db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    db.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/account/addresses");
  return { ok: true };
}

/* ---------- profile ---------- */
export async function updateProfile(_: ActionResult | undefined, fd: FormData): Promise<ActionResult> {
  const user = await me();
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Enter your name").max(80),
      phone: z.string().trim().transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "")).refine((v) => v === "" || /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number"),
      marketing: z.boolean(),
    })
    .safeParse({ name: fd.get("name") ?? "", phone: fd.get("phone") ?? "", marketing: fd.get("marketing") === "on" });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  if (parsed.data.phone) {
    const taken = await db.user.findUnique({ where: { phone: parsed.data.phone }, select: { id: true } });
    if (taken && taken.id !== user.id) return { ok: false, fieldErrors: { phone: "This mobile number is already used by another account." } };
  }
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone || null, marketingOptIn: parsed.data.marketing } });
  if (parsed.data.marketing) await db.subscriber.upsert({ where: { email: user.email }, create: { email: user.email }, update: {} }).catch(() => {});
  else await db.subscriber.deleteMany({ where: { email: user.email } }).catch(() => {});
  revalidatePath("/account", "layout");
  return { ok: true, message: "Profile saved" };
}

export async function changePassword(_: ActionResult | undefined, fd: FormData): Promise<ActionResult> {
  const user = await me();
  if (!rateLimit(`pw:${user.id}`, 6, 15 * 60_000).ok) return { ok: false, error: "Too many attempts. Try again later." };
  const current = String(fd.get("current") ?? "");
  const next = passwordRule.safeParse(String(fd.get("password") ?? ""));
  if (!next.success) return { ok: false, fieldErrors: { password: next.error.issues[0].message } };
  if (String(fd.get("confirm") ?? "") !== next.data) return { ok: false, fieldErrors: { confirm: "Passwords do not match" } };
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  // Google-only accounts have no password yet: they can create one while signed in
  if (row.passwordHash && !(await verifyPassword(current, row.passwordHash))) return { ok: false, fieldErrors: { current: "Your current password is not correct" } };
  const updated = await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next.data), tokenVersion: { increment: 1 } } });
  await createSession(updated); // signs out every other device
  return { ok: true, message: row.passwordHash ? "Password changed. Other devices have been signed out." : "Password created. You can now also sign in with your email or mobile number." };
}

/* ---------- orders ---------- */
async function ownedOrder(number: string) {
  const user = await me();
  const order = await db.order.findUnique({ where: { number: String(number) }, include: { items: true } });
  if (!order || !(user.emailVerified || !order.isGuest) || order.userId !== user.id) throw new Error("Order not found");
  return order;
}

export async function cancelOrder(number: string, reason?: string): Promise<ActionResult> {
  try {
    const order = await ownedOrder(number);
    if (!CUSTOMER_CANCELLABLE.includes(order.status)) return { ok: false, error: "This order can no longer be cancelled. Please contact us." };
    const note = reason?.trim() ? `Cancelled by you: ${reason.trim().slice(0, 200)}` : undefined;
    await changeOrderStatus(order.id, "CANCELLED", { actor: "customer", note: note ? note + (order.paymentStatus === "PAID" ? " Your refund will be processed to the original payment method in 5–7 working days." : "") : undefined });
    if (order.paymentStatus === "PAID") await db.order.update({ where: { id: order.id }, data: { adminNote: "Cancelled by customer after payment — refund due" } });
    revalidatePath(`/account/orders/${number}`);
    revalidatePath("/account/orders");
    return { ok: true, message: "Order cancelled" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function requestReturn(number: string, reason: string): Promise<ActionResult> {
  try {
    const order = await ownedOrder(number);
    const s = await getSettings();
    if (!s.commerce.returnsEnabled) return { ok: false, error: "Returns are not available. Please contact us if something is wrong." };
    if (order.status !== "DELIVERED") return { ok: false, error: "Returns can be requested after delivery" };
    const delivered = await db.orderEvent.findFirst({ where: { orderId: order.id, status: "DELIVERED" }, orderBy: { createdAt: "desc" } });
    const since = delivered?.createdAt ?? order.updatedAt;
    if (Date.now() - since.getTime() > s.commerce.returnDays * 86400000) return { ok: false, error: `Returns are accepted within ${s.commerce.returnDays} days of delivery` };
    const r = reason.trim();
    if (r.length < 5) return { ok: false, error: "Tell us briefly what went wrong" };
    await changeOrderStatus(order.id, "RETURN_REQUESTED", { actor: "customer", note: `Return requested: ${r.slice(0, 300)}` });
    revalidatePath(`/account/orders/${number}`);
    return { ok: true, message: "Return requested. We will be in touch within one working day." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Rebuilds cart lines for "Buy again" from current product data. Items no longer available are skipped. */
export async function buyAgainLines(number: string): Promise<{ lines: CartLine[]; skipped: number }> {
  const order = await ownedOrder(number);
  const ids = order.items.map((i) => i.productId).filter((x): x is string => Boolean(x));
  const products = await db.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } });
  const lines: CartLine[] = [];
  let skipped = 0;
  for (const it of order.items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p) { skipped++; continue; }
    const groups = parseOptions(p.options);
    const snaps = it.selections as SelectionSnapshot[];
    const selections = [];
    let ok = true;
    for (const sn of snaps) {
      const g = groups.find((x) => x.name === sn.group);
      const v = g?.values.find((x) => x.label === sn.value && x.available);
      if (!g || !v) { ok = false; break; }
      selections.push({ groupId: g.id, valueId: v.id });
    }
    if (!ok) { skipped++; continue; }
    const price = selections.reduce((a, s) => a + (groups.find((g) => g.id === s.groupId)?.values.find((v) => v.id === s.valueId)?.priceDelta ?? 0), p.price);
    lines.push({
      key: lineKey(p.id, selections, it.personalization),
      productId: p.id, slug: p.slug, name: p.name, image: it.image ?? p.images[0]?.url ?? null,
      unitPrice: price, quantity: it.quantity, selections, selectionLabels: snaps, personalization: it.personalization ?? undefined,
    });
  }
  return { lines, skipped };
}
