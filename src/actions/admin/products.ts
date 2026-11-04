"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/auth";
import { slugify, uid } from "@/lib/utils";
import { firstError, zodFieldErrors, type ActionResult } from "@/lib/admin-types";

const valueSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, "Every option value needs a label").max(80),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  priceDelta: z.number().int().min(-10_000_000).max(10_000_000),
  image: z.string().max(1000).nullish(),
  available: z.boolean(),
});
const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Every option group needs a name").max(60),
  display: z.enum(["swatch", "button", "dropdown"]),
  required: z.boolean(),
  values: z.array(valueSchema).min(1, "Each option group needs at least one value").max(60),
});

const productInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(140),
  slug: z.string().trim().max(80).optional().default(""),
  shortDescription: z.string().trim().max(300).optional().default(""),
  description: z.string().max(20000).default(""),
  price: z.number({ error: "Enter a valid price" }).int().min(0).max(100_000_000),
  compareAtPrice: z.number().int().min(0).max(100_000_000).nullable(),
  sku: z.string().trim().max(60).optional().default(""),
  stock: z.number().int().min(0).max(1_000_000),
  trackInventory: z.boolean(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  featured: z.boolean(),
  isGiftable: z.boolean(),
  badge: z.string().trim().max(30).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(30),
  categoryId: z.string().nullable(),
  images: z.array(z.object({ url: z.string().trim().min(1).max(1000), alt: z.string().max(200).optional().default("") })).max(20),
  options: z.array(groupSchema).max(10),
  specs: z.array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(200) })).max(30),
  personalization: z.object({
    enabled: z.boolean(),
    label: z.string().trim().max(80),
    maxLength: z.number().int().min(1).max(200),
    price: z.number().int().min(0).max(10_000_000),
    required: z.boolean(),
  }),
  seoTitle: z.string().trim().max(120).optional().default(""),
  seoDescription: z.string().trim().max(300).optional().default(""),
});
export type ProductInput = z.input<typeof productInputSchema>;

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "product";
  let slug = root;
  for (let i = 2; i < 200; i++) {
    const hit = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${uid()}`;
}

export async function checkSlug(slug: string, excludeId?: string): Promise<{ available: boolean; suggestion: string }> {
  await assertAdmin();
  const s = slugify(slug);
  const hit = s ? await db.product.findUnique({ where: { slug: s }, select: { id: true } }) : null;
  return { available: !!s && (!hit || hit.id === excludeId), suggestion: await uniqueSlug(s || "product", excludeId) };
}

export async function saveProduct(id: string | null, input: ProductInput): Promise<ActionResult<{ id: string }>> {
  await assertAdmin();
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error.issues), fieldErrors: zodFieldErrors(parsed.error.issues) };
  const p = parsed.data;

  if (p.compareAtPrice !== null && p.compareAtPrice > 0 && p.compareAtPrice <= p.price) return { ok: false, error: "Compare-at price must be higher than the price (or leave it empty)", fieldErrors: { compareAtPrice: "Must be higher than price" } };
  if (p.categoryId) {
    const cat = await db.category.findUnique({ where: { id: p.categoryId }, select: { id: true } });
    if (!cat) return { ok: false, error: "Selected category no longer exists" };
  }

  // Normalise option ids (unique within product / group) and make sure the cheapest combination can't go below zero.
  const groupIds = new Set<string>();
  const options = p.options.map((g) => {
    let gid = slugify(g.id || g.name) || uid("g");
    while (groupIds.has(gid)) gid = `${gid}-${uid().slice(0, 4)}`;
    groupIds.add(gid);
    const valueIds = new Set<string>();
    const values = g.values.map((v) => {
      let vid = slugify(v.id || v.label) || uid("v");
      while (valueIds.has(vid)) vid = `${vid}-${uid().slice(0, 4)}`;
      valueIds.add(vid);
      return { id: vid, label: v.label, hex: g.display === "swatch" ? v.hex ?? "#cccccc" : v.hex ?? null, priceDelta: v.priceDelta, image: v.image || null, available: v.available };
    });
    return { id: gid, name: g.name, display: g.display, required: g.required, values };
  });
  let minPrice = p.price;
  for (const g of options) {
    const deltas = g.values.map((v) => v.priceDelta);
    const lowest = Math.min(...deltas);
    if (g.required) minPrice += lowest;
    else if (lowest < 0) minPrice += lowest;
  }
  if (minPrice < 0) return { ok: false, error: "Negative price changes make some combinations cost less than ₹0. Adjust the option prices." };
  if (p.personalization.enabled && !p.personalization.label) return { ok: false, error: "Give the personalisation field a label", fieldErrors: { "personalization.label": "Required" } };

  const slug = await uniqueSlug(p.slug || p.name, id ?? undefined);
  const tags = [...new Set(p.tags.map((t) => t.toLowerCase()))];
  const data = {
    name: p.name,
    slug,
    shortDescription: p.shortDescription || null,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice : null,
    sku: p.sku || null,
    stock: p.stock,
    trackInventory: p.trackInventory,
    status: p.status,
    featured: p.featured,
    isGiftable: p.isGiftable,
    badge: p.badge || null,
    tags,
    categoryId: p.categoryId,
    options: options as object,
    specs: p.specs as object,
    personalization: p.personalization.enabled ? (p.personalization as object) : { ...p.personalization, enabled: false },
    seoTitle: p.seoTitle || null,
    seoDescription: p.seoDescription || null,
  };
  const images = p.images.map((im, i) => ({ url: im.url, alt: im.alt || p.name, sortOrder: i }));

  let productId: string;
  if (id) {
    const exists = await db.product.findUnique({ where: { id }, select: { id: true, slug: true } });
    if (!exists) return { ok: false, error: "Product not found" };
    await db.$transaction([db.productImage.deleteMany({ where: { productId: id } }), db.product.update({ where: { id }, data: { ...data, images: { create: images } } })]);
    productId = id;
    if (exists.slug !== slug) revalidatePath(`/product/${exists.slug}`);
  } else {
    const created = await db.product.create({ data: { ...data, images: { create: images } } });
    productId = created.id;
  }
  revalidatePath("/", "layout");
  return { ok: true, data: { id: productId }, message: "Product saved" };
}

export async function duplicateProduct(id: string): Promise<ActionResult<{ id: string }>> {
  await assertAdmin();
  const p = await db.product.findUnique({ where: { id }, include: { images: true } });
  if (!p) return { ok: false, error: "Product not found" };
  const slug = await uniqueSlug(`${p.slug}-copy`);
  const copy = await db.product.create({
    data: {
      name: `${p.name} (copy)`, slug, shortDescription: p.shortDescription, description: p.description, price: p.price, compareAtPrice: p.compareAtPrice, sku: null, stock: p.stock, trackInventory: p.trackInventory,
      status: "DRAFT", featured: false, isGiftable: p.isGiftable, badge: p.badge, tags: p.tags, categoryId: p.categoryId, options: p.options as object, specs: p.specs as object,
      personalization: (p.personalization ?? undefined) as object | undefined, seoTitle: p.seoTitle, seoDescription: p.seoDescription,
      images: { create: p.images.map((im) => ({ url: im.url, alt: im.alt, sortOrder: im.sortOrder })) },
    },
  });
  revalidatePath("/admin/products");
  return { ok: true, data: { id: copy.id }, message: "Duplicated as draft" };
}

export async function setProductStatus(id: string, status: "DRAFT" | "ACTIVE" | "ARCHIVED"): Promise<ActionResult> {
  await assertAdmin();
  await db.product.update({ where: { id }, data: { status } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await assertAdmin();
  const used = await db.orderItem.count({ where: { productId: id } });
  if (used > 0) {
    await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    revalidatePath("/", "layout");
    return { ok: true, message: "This product has orders, so it was archived instead of deleted." };
  }
  await db.product.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Product deleted" };
}
