"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Copy, Trash2 } from "lucide-react";
import { deleteProduct, duplicateProduct, setProductStatus } from "@/actions/admin/products";
import { useConfirm } from "./confirm";
import { cn } from "@/lib/utils";

export function ProductRowActions({ id, status, name, className }: { id: string; status: "DRAFT" | "ACTIVE" | "ARCHIVED"; name: string; className?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string; data?: { id: string } }>, after?: (d?: { id: string }) => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Something went wrong. Try again.");
      else {
        if (r.message) toast.success(r.message);
        after?.(r.data);
        router.refresh();
      }
    });
  return (
    <div className={cn("flex flex-wrap justify-end gap-1", className)} aria-busy={pending}>
      <button type="button" disabled={pending} className="text-btn" onClick={() => run(() => duplicateProduct(id), (d) => d && router.push(`/admin/products/${d.id}`))}><Copy size={18} aria-hidden />Duplicate</button>
      {status !== "ARCHIVED" ? (
        <button type="button" disabled={pending} className="text-btn" onClick={async () => { if (await confirm({ title: `Archive “${name}”?`, body: "It is hidden from the store but kept, with its orders and reviews. You can restore it any time.", confirmLabel: "Archive" })) run(() => setProductStatus(id, "ARCHIVED")); }}><Archive size={18} aria-hidden />Archive</button>
      ) : (
        <button type="button" disabled={pending} className="text-btn" onClick={() => run(() => setProductStatus(id, "DRAFT"))}><ArchiveRestore size={18} aria-hidden />Restore</button>
      )}
      <button type="button" disabled={pending} className="text-btn is-danger" onClick={async () => { if (await confirm({ title: `Delete “${name}”?`, body: "This removes the product for good. Past orders keep their details. To just hide it, archive it instead.", confirmLabel: "Delete product", danger: true })) run(() => deleteProduct(id)); }}><Trash2 size={18} aria-hidden />Delete</button>
    </div>
  );
}
