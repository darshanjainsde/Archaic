"use client";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  return (
    <button type="button" className="text-btn shrink-0" onClick={async () => {
      try { await navigator.clipboard.writeText(text); toast.success("Copied"); } catch { toast.error("Could not copy. Select the text and copy it instead."); }
    }}><Copy size={18} aria-hidden />{label}</button>
  );
}
