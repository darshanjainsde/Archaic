"use client";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  return (
    <button type="button" className="inline-flex items-center gap-1 rounded px-2 py-1 text-[13px] hover:bg-black/5" onClick={async () => {
      try { await navigator.clipboard.writeText(text); toast.success("Copied"); } catch { toast.error("Could not copy"); }
    }}><Copy size={14} aria-hidden />{label}</button>
  );
}
