"use client";
import { Minus, Plus } from "lucide-react";

export function QtyStepper({ value, max, onChange, label }: { value: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center bg-surface" style={{ borderRadius: "var(--btn-radius)" }} role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" className="grid h-10 w-10 place-items-center disabled:opacity-40" onClick={() => onChange(value - 1)} aria-label="Decrease quantity" disabled={value <= 1}><Minus size={16} /></button>
      <span className="w-8 text-center tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="grid h-10 w-10 place-items-center disabled:opacity-40" onClick={() => onChange(value + 1)} aria-label="Increase quantity" disabled={value >= max}><Plus size={16} /></button>
    </div>
  );
}
