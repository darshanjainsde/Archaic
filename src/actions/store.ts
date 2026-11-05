"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, HINT_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export type ActionResult = { ok: boolean; message: string };

export async function subscribeNewsletter(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = z.string().trim().toLowerCase().email().max(200).safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, message: "Please enter a valid email address." };
  const rl = rateLimit(`news:${await ip()}`, 8, 60_000);
  if (!rl.ok) return { ok: false, message: "Too many attempts. Please try again in a minute." };
  await db.subscriber.upsert({ where: { email: parsed.data }, create: { email: parsed.data }, update: {} });
  return { ok: true, message: "You are on the list. The first letter is on its way soon." };
}

export async function toggleWishlist(productId: string): Promise<{ ok: boolean; needsLogin?: boolean; wishlisted?: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsLogin: true };
  const id = z.string().min(1).max(64).safeParse(productId);
  if (!id.success) return { ok: false, message: "Invalid product" };
  const product = await db.product.findUnique({ where: { id: id.data }, select: { id: true } });
  if (!product) return { ok: false, message: "This product is no longer available" };
  const existing = await db.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId: id.data } } });
  if (existing) await db.wishlistItem.delete({ where: { id: existing.id } });
  else await db.wishlistItem.create({ data: { userId: user.id, productId: id.data } }).catch(() => null);
  revalidatePath("/wishlist");
  return { ok: true, wishlisted: !existing };
}

/**
 * What a cached page needs to know about the visitor, in one call: signed in (and admin?), the wishlist,
 * and their review of one product. Also keeps the browser-readable hint cookie in step with the session.
 */
export async function myState(productId?: string | null): Promise<{ role: "u" | "a" | null; wishlist: string[]; review: { rating: number; title: string | null; body: string } | null }> {
  const user = await getCurrentUser();
  const jar = await cookies();
  if (!user) {
    if (jar.get(HINT_COOKIE)) jar.delete(HINT_COOKIE);
    return { role: null, wishlist: [], review: null };
  }
  const role = user.role === "ADMIN" ? "a" : "u";
  if (jar.get(HINT_COOKIE)?.value !== role) jar.set(HINT_COOKIE, role, { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  const pid = typeof productId === "string" && productId.length <= 64 ? productId : null;
  const [items, review] = await Promise.all([
    db.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true }, take: 500 }),
    pid ? db.review.findUnique({ where: { productId_userId: { productId: pid, userId: user.id } }, select: { rating: true, title: true, body: true } }) : null,
  ]);
  return { role, wishlist: items.map((i) => i.productId), review };
}

const reviewSchema = z.object({
  productId: z.string().min(1).max(64),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional().default(""),
  body: z.string().trim().min(10, "Please write at least 10 characters.").max(2000),
});

export async function submitReview(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in to write a review." };
  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    body: formData.get("body"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your review." };
  const rl = rateLimit(`review:${user.id}`, 5, 60_000);
  if (!rl.ok) return { ok: false, message: "Please wait a moment before trying again." };
  const product = await db.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true, slug: true } });
  if (!product) return { ok: false, message: "This product is no longer available." };
  const purchased = await db.orderItem.count({
    where: { productId: product.id, order: { userId: user.id, OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }], status: { notIn: ["CANCELLED", "REFUNDED", "RETURNED"] } } },
  });
  const data = { rating: parsed.data.rating, title: parsed.data.title || null, body: parsed.data.body, isVerified: purchased > 0 };
  await db.review.upsert({
    where: { productId_userId: { productId: product.id, userId: user.id } },
    create: { ...data, productId: product.id, userId: user.id },
    update: data,
  });
  revalidatePath(`/product/${product.slug}`);
  return { ok: true, message: "Thank you — your review is published." };
}
