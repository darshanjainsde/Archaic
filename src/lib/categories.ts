import "server-only";
import { unstable_cache, updateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export const CATEGORIES_TAG = "categories";

export type MenuCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  /** Active products in this category plus its sub-categories */
  count: number;
  showInMenu: boolean;
  children: MenuCategory[];
};

async function readTree(): Promise<MenuCategory[]> {
  const rows = await db.category.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
  });
  const byParent = new Map<string | null, typeof rows>();
  for (const r of rows) {
    const list = byParent.get(r.parentId) ?? [];
    list.push(r);
    byParent.set(r.parentId, list);
  }
  const build = (parentId: string | null): MenuCategory[] =>
    (byParent.get(parentId) ?? []).map((r) => {
      const children = parentId === null ? build(r.id) : [];
      return {
        id: r.id, slug: r.slug, name: r.name, description: r.description, image: r.image, showInMenu: r.showInMenu,
        count: r._count.products + children.reduce((n, c) => n + c.count, 0),
        children,
      };
    });
  return build(null);
}

const readCached = unstable_cache(readTree, ["category-tree-v1"], { tags: [CATEGORIES_TAG], revalidate: 600 });

/** Visible categories as a two-level tree with product counts. Cached across requests; cleared by `touchCategories()`. */
export async function getCategoryTree(): Promise<MenuCategory[]> {
  try {
    return await readCached();
  } catch (err) {
    console.error("[categories] failed to load", err);
    return [];
  }
}

/** Call after anything that changes categories or which products belong to them. */
export function touchCategories() {
  updateTag(CATEGORIES_TAG);
}

/** Products in a category OR any of its sub-categories. */
export function categoryWhere(slug: string): Prisma.ProductWhereInput {
  return { OR: [{ category: { slug } }, { category: { parent: { slug } } }] };
}

/** Flat list for admin selects: parents first, each followed by its children. */
export function flattenTree(tree: MenuCategory[]) {
  const out: { id: string; name: string; slug: string; parentName: string | null }[] = [];
  for (const c of tree) {
    out.push({ id: c.id, name: c.name, slug: c.slug, parentName: null });
    for (const k of c.children) out.push({ id: k.id, name: k.name, slug: k.slug, parentName: c.name });
  }
  return out;
}
