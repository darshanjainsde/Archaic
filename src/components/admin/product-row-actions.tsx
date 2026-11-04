"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteProduct, duplicateProduct, setProductStatus } from "@/actions/admin/products";

export function ProductRowActions({ id, status, name }: { id: string; status: "DRAFT" | "ACTIVE" | "ARCHIVED"; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string; data?: { id: string } }>, after?: (d?: { id: string }) => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Something went wrong");
      else {
        if (r.message) toast.success(r.message);
        after?.(r.data);
        router.refresh();
      }
    });
  return (
    <div className="flex flex-wrap justify-end gap-1 text-[13px]" aria-busy={pending}>
      <button disabled={pending} className="rounded px-2 py-1 hover:bg-black/5" onClick={() => run(() => duplicateProduct(id), (d) => d && router.push(`/admin/products/${d.id}`))}>Duplicate</button>
      {status !== "ARCHIVED" ? (
        <button disabled={pending} className="rounded px-2 py-1 hover:bg-black/5" onClick={() => run(() => setProductStatus(id, "ARCHIVED"))}>Archive</button>
      ) : (
        <button disabled={pending} className="rounded px-2 py-1 hover:bg-black/5" onClick={() => run(() => setProductStatus(id, "DRAFT"))}>Restore</button>
      )}
      <button disabled={pending} className="rounded px-2 py-1 text-sale hover:bg-red-50" onClick={() => confirm(`Delete “${name}”? This cannot be undone.`) && run(() => deleteProduct(id))}>Delete</button>
    </div>
  );
}
