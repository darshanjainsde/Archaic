"use client";
import { useId } from "react";

export function ColorField({ label, value, onChange, warn }: { label: string; value: string; onChange: (v: string) => void; warn?: string | null }) {
  const id = useId();
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label}: pick a colour`} className="h-12 w-12 shrink-0 cursor-pointer rounded-lg border border-black/15 bg-transparent p-1" value={valid ? value : "#000000"} onChange={(e) => onChange(e.target.value)} />
        <input id={id} aria-invalid={!valid} autoComplete="off" spellCheck={false} className="field min-w-0 font-[inherit] uppercase" value={value} maxLength={7} onChange={(e) => onChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)} />
      </div>
      {!valid && <p className="error-text">Use a 6-digit colour code, e.g. #2B2216</p>}
      {warn && <p className="hint !text-amber-800">{warn}</p>}
    </div>
  );
}
