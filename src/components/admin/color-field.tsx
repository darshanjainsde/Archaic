"use client";
export function ColorField({ label, value, onChange, warn }: { label: string; value: string; onChange: (v: string) => void; warn?: string | null }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} className="h-10 w-12 shrink-0 cursor-pointer rounded border border-black/10 bg-transparent" value={valid ? value : "#000000"} onChange={(e) => onChange(e.target.value)} />
        <input aria-label={`${label} hex`} aria-invalid={!valid} className="field !min-h-[40px] !py-2 font-[inherit] uppercase" value={value} maxLength={7} onChange={(e) => onChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)} />
      </div>
      {!valid && <p className="error-text">Use 6-digit hex, e.g. #2B2216</p>}
      {warn && <p className="mt-1 text-[12px] text-amber-800">{warn}</p>}
    </div>
  );
}
