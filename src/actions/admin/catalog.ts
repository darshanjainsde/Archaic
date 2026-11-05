"use server";
import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import { touchCategories } from "@/lib/categories";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { fstr, fbool, fint, fdate } from "@/lib/form-data";
import { rupeesToPaise } from "@/lib/money";
import { firstError, zodFieldErrors, type ActionResult } from "@/lib/admin-types";

type R = ActionResult<{ redirect?: string }>;
const ok = (message: string, redirect?: string): R => ({ ok: true, message, data: redirect ? { redirect } : undefined });

/* ---------------- Categories ---------------- */
const catSchema = z.object({ name: z.string().min(1, "Name is required").max(80), slug: z.string().min(1).max(80), description: z.string().max(500), image: z.string().max(1000), sortOrder: z.number().int().min(0).max(9999), isVisible: z.boolean(), showInMenu: z.boolean(), parentId: z.string().max(40) });

export async function saveCategory(_: R | null, fd: FormData): Promise<R> {
  await assertAdmin();
  const id = fstr(fd, "id") || null;
  const parsed = catSchema.safeParse({ name: fstr(fd, "name"), slug: slugify(fstr(fd, "slug") || fstr(fd, "name")), description: fstr(fd, "description"), image: fstr(fd, "image"), sortOrder: fint(fd, "sortOrder"), isVisible: fbool(fd, "isVisible"), showInMenu: fbool(fd, "showInMenu"), parentId: fstr(fd, "parentId") });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error.issues), fieldErrors: zodFieldErrors(parsed.error.issues) };
  const d = parsed.data;
  const clash = await db.category.findUnique({ where: { slug: d.slug } });
  if (clash && clash.id !== id) return { ok: false, error: `The URL “${d.slug}” is already used by ${clash.name}` };
  const parentId = d.parentId || null;
  if (parentId) {
    if (parentId === id) return { ok: false, error: "A category cannot be inside itself" };
    const parent = await db.category.findUnique({ where: { id: parentId }, select: { parentId: true, name: true } });
    if (!parent) return { ok: false, error: "That parent category no longer exists" };
    if (parent.parentId) return { ok: false, error: `${parent.name} is already a sub-category. Only two levels are allowed: category → sub-category.` };
    if (id) {
      const kids = await db.category.count({ where: { parentId: id } });
      if (kids > 0) return { ok: false, error: `This category has ${kids} sub-categories, so it cannot be moved under another one. Move them out first.` };
    }
  }
  const data = { name: d.name, slug: d.slug, sortOrder: d.sortOrder, isVisible: d.isVisible, showInMenu: d.showInMenu, parentId, description: d.description || null, image: d.image || null };
  if (id) await db.category.update({ where: { id }, data });
  else await db.category.create({ data });
  revalidatePath("/", "layout");
  touchCategories();
  return ok(id ? "Category updated" : "Category created");
}

export async function deleteCategory(id: string): Promise<R> {
  await assertAdmin();
  await db.$transaction([
    db.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
    db.category.updateMany({ where: { parentId: id }, data: { parentId: null } }),
    db.category.delete({ where: { id } }),
  ]);
  revalidatePath("/", "layout");
  touchCategories();
  return ok("Category deleted. Its products now have no category; its sub-categories are now top-level.");
}

/** Set exactly which products belong to a category (ticked = in, unticked = removed from it). */
export async function assignProductsToCategory(categoryId: string, productIds: string[]): Promise<R> {
  await assertAdmin();
  const cat = await db.category.findUnique({ where: { id: categoryId }, select: { id: true, name: true } });
  if (!cat) return { ok: false, error: "Category not found" };
  const ids = [...new Set(productIds.filter((x) => typeof x === "string" && x.length < 40))].slice(0, 2000);
  await db.$transaction([
    db.product.updateMany({ where: { categoryId, id: { notIn: ids } }, data: { categoryId: null } }),
    db.product.updateMany({ where: { id: { in: ids } }, data: { categoryId } }),
  ]);
  revalidatePath("/", "layout");
  touchCategories();
  return ok(`${ids.length} product${ids.length === 1 ? "" : "s"} now in ${cat.name}`);
}

/* ---------------- Coupons ---------------- */
export async function saveCoupon(_: R | null, fd: FormData): Promise<R> {
  await assertAdmin();
  const id = fstr(fd, "id") || null;
  const code = fstr(fd, "code").toUpperCase().replace(/\s+/g, "");
  const type = fstr(fd, "type") === "FIXED" ? "FIXED" : "PERCENT";
  const rawValue = fstr(fd, "value");
  const value = type === "PERCENT" ? Math.trunc(Number(rawValue)) : rupeesToPaise(rawValue);
  const minOrder = rupeesToPaise(fstr(fd, "minOrder") || "0");
  const maxDiscount = fstr(fd, "maxDiscount") ? rupeesToPaise(fstr(fd, "maxDiscount")) : null;
  const usageLimit = fstr(fd, "usageLimit") ? fint(fd, "usageLimit") : null;
  const perUserLimit = fstr(fd, "perUserLimit") ? fint(fd, "perUserLimit") : null;
  const startsAt = fdate(fd, "startsAt");
  const expiresAt = fdate(fd, "expiresAt");
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { ok: false, error: "Code must be 3–30 letters, numbers, - or _" };
  if (value === null || !Number.isFinite(value) || value <= 0) return { ok: false, error: "Enter a discount value above 0" };
  if (type === "PERCENT" && value > 100) return { ok: false, error: "Percent discount cannot exceed 100" };
  if (minOrder === null) return { ok: false, error: "Minimum order is not a valid amount" };
  if (fstr(fd, "maxDiscount") && maxDiscount === null) return { ok: false, error: "Maximum discount is not a valid amount" };
  if ((usageLimit !== null && usageLimit < 1) || (perUserLimit !== null && perUserLimit < 1)) return { ok: false, error: "Limits must be 1 or more (leave empty for no limit)" };
  if (startsAt && expiresAt && expiresAt <= startsAt) return { ok: false, error: "End date must be after start date" };
  const clash = await db.coupon.findUnique({ where: { code } });
  if (clash && clash.id !== id) return { ok: false, error: `Code ${code} already exists` };
  const data = { code, type: type as "PERCENT" | "FIXED", value, minOrder, maxDiscount: type === "PERCENT" ? maxDiscount : null, usageLimit, perUserLimit, startsAt, expiresAt, description: fstr(fd, "description") || null, isActive: fbool(fd, "isActive") };
  if (id) await db.coupon.update({ where: { id }, data });
  else await db.coupon.create({ data });
  revalidatePath("/admin/coupons");
  return ok(id ? "Coupon updated" : "Coupon created");
}
export async function deleteCoupon(id: string): Promise<R> {
  await assertAdmin();
  await db.coupon.delete({ where: { id } });
  revalidatePath("/admin/coupons");
  return ok("Coupon deleted");
}

/* ---------------- Banners ---------------- */
const hexOrEmpty = z.string().regex(/^(#[0-9a-fA-F]{6})?$/, "Colours must be hex like #2b2216");
export async function saveBanner(_: R | null, fd: FormData): Promise<R> {
  await assertAdmin();
  const id = fstr(fd, "id") || null;
  const schema = z.object({
    placement: z.enum(["HERO", "PROMO", "STRIP", "POPUP"]), title: z.string().min(1, "Title is required").max(140), subtitle: z.string().max(400), ctaLabel: z.string().max(40),
    ctaHref: z.string().max(500).refine((v) => !v || v.startsWith("/") || /^https?:\/\//.test(v), "Link must start with / or https://"),
    image: z.string().max(1000), mobileImage: z.string().max(1000), bgColor: hexOrEmpty, textColor: hexOrEmpty, sortOrder: z.number().int(), isActive: z.boolean(),
  });
  const parsed = schema.safeParse({ placement: fstr(fd, "placement"), title: fstr(fd, "title"), subtitle: fstr(fd, "subtitle"), ctaLabel: fstr(fd, "ctaLabel"), ctaHref: fstr(fd, "ctaHref"), image: fstr(fd, "image"), mobileImage: fstr(fd, "mobileImage"), bgColor: fstr(fd, "bgColor"), textColor: fstr(fd, "textColor"), sortOrder: fint(fd, "sortOrder"), isActive: fbool(fd, "isActive") });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error.issues) };
  const startsAt = fdate(fd, "startsAt");
  const endsAt = fdate(fd, "endsAt");
  if (startsAt && endsAt && endsAt <= startsAt) return { ok: false, error: "End must be after start" };
  const d = parsed.data;
  const data = { ...d, subtitle: d.subtitle || null, ctaLabel: d.ctaLabel || null, ctaHref: d.ctaHref || null, image: d.image || null, mobileImage: d.mobileImage || null, bgColor: d.bgColor || null, textColor: d.textColor || null, startsAt, endsAt };
  if (id) await db.banner.update({ where: { id }, data });
  else await db.banner.create({ data });
  revalidatePath("/", "layout");
  return ok(id ? "Banner updated" : "Banner created", "/admin/banners");
}
export async function deleteBanner(id: string): Promise<R> {
  await assertAdmin();
  await db.banner.delete({ where: { id } });
  revalidatePath("/", "layout");
  return ok("Banner deleted", "/admin/banners");
}
export async function toggleBanner(id: string, isActive: boolean): Promise<R> {
  await assertAdmin();
  await db.banner.update({ where: { id }, data: { isActive } });
  revalidatePath("/", "layout");
  return ok(isActive ? "Banner shown" : "Banner hidden");
}

/* ---------------- Pages ---------------- */
const RESERVED = new Set(["admin", "account", "api", "shop", "product", "cart", "checkout"]);
export async function savePage(_: R | null, fd: FormData): Promise<R> {
  await assertAdmin();
  const id = fstr(fd, "id") || null;
  const title = fstr(fd, "title");
  const slug = slugify(fstr(fd, "slug") || title);
  if (!title) return { ok: false, error: "Title is required" };
  if (!slug || RESERVED.has(slug)) return { ok: false, error: "Choose a different URL" };
  const content = String(fd.get("content") ?? "").slice(0, 100000);
  const clash = await db.page.findUnique({ where: { slug } });
  if (clash && clash.id !== id) return { ok: false, error: `The URL /pages/${slug} is already used` };
  const data = { title: title.slice(0, 140), slug, content, isPublished: fbool(fd, "isPublished"), showInFooter: fbool(fd, "showInFooter") };
  const page = id ? await db.page.update({ where: { id }, data }) : await db.page.create({ data });
  updateTag("pages");
  revalidatePath("/", "layout");
  return ok("Page saved", id ? undefined : `/admin/pages?edit=${page.id}`);
}
export async function deletePage(id: string): Promise<R> {
  await assertAdmin();
  await db.page.delete({ where: { id } });
  updateTag("pages");
  revalidatePath("/", "layout");
  return ok("Page deleted", "/admin/pages");
}

/* ---------------- Reviews ---------------- */
export async function setReviewVisible(id: string, isVisible: boolean): Promise<R> {
  await assertAdmin();
  const r = await db.review.update({ where: { id }, data: { isVisible }, include: { product: { select: { slug: true } } } });
  revalidatePath(`/product/${r.product.slug}`);
  revalidatePath("/admin/reviews");
  return ok(isVisible ? "Review shown" : "Review hidden");
}
export async function deleteReview(id: string): Promise<R> {
  await assertAdmin();
  const r = await db.review.delete({ where: { id }, include: { product: { select: { slug: true } } } });
  revalidatePath(`/product/${r.product.slug}`);
  revalidatePath("/admin/reviews");
  return ok("Review deleted");
}

/* ---------------- Customers ---------------- */
export async function setUserRole(userId: string, role: "ADMIN" | "CUSTOMER"): Promise<R> {
  const me = await assertAdmin();
  if (userId === me.id && role !== "ADMIN") return { ok: false, error: "You cannot remove your own admin access" };
  if (role === "CUSTOMER") {
    const admins = await db.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) return { ok: false, error: "There must be at least one admin" };
  }
  // bump tokenVersion so the role change applies to existing sessions immediately
  await db.user.update({ where: { id: userId }, data: { role, tokenVersion: { increment: 1 } } });
  revalidatePath(`/admin/customers/${userId}`);
  return ok(role === "ADMIN" ? "Admin access granted" : "Admin access removed");
}
