"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible slide-over panel (mobile menu, filters, bag). Esc closes, body scroll locks, focus moves in and back. */
export function Sheet({ open, onClose, side = "right", title, head, children, className }: { open: boolean; onClose: () => void; side?: "left" | "right" | "bottom"; title: string; /** Optional visual heading (e.g. the logo) shown instead of the title text; `title` stays the dialog's name. */ head?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  return (
    <div className={cn("fixed inset-0 z-[60]", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div className={cn("absolute inset-0 bg-black/55 transition-opacity duration-300 motion-reduce:transition-none", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "absolute flex flex-col bg-bg text-ink shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none",
          side === "bottom" ? "inset-x-0 bottom-0 max-h-[88dvh] pb-safe" : "inset-y-0 w-[min(92vw,420px)]",
          side === "right" && "right-0",
          side === "left" && "left-0",
          open ? "translate-x-0 translate-y-0" : side === "right" ? "translate-x-full" : side === "left" ? "-translate-x-full" : "translate-y-full",
          className,
        )}
        {...(!open ? { inert: true } : {})}
      >
        <div className="flex items-center justify-between px-5 py-4">
          {head ?? <h2 className="text-2xl">{title}</h2>}
          <button onClick={onClose} aria-label="Close" className="-mr-2 p-2"><X size={22} /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
