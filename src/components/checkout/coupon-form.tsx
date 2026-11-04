"use client";
import { useEffect, useState } from "react";

export function CouponForm({ code, error, applied, onApply }: { code: string | null; error: string | null; applied: boolean; onApply: (code: string | null) => void }) {
  const [value, setValue] = useState(code ?? "");
  useEffect(() => setValue(code ?? ""), [code]);
  if (code && applied)
    return (
      <div className="flex items-center justify-between gap-3 text-[15px]">
        <span>Code <b>{code}</b> applied</span>
        <button type="button" className="underline" onClick={() => onApply(null)}>Remove</button>
      </div>
    );
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const v = value.trim(); if (v) onApply(v); }}
      className="space-y-1"
    >
      <label htmlFor="coupon" className="label">Discount code</label>
      <div className="flex gap-2">
        <input id="coupon" className="field uppercase" value={value} onChange={(e) => setValue(e.target.value.toUpperCase().slice(0, 40))} autoComplete="off" autoCapitalize="characters" aria-invalid={Boolean(code && error)} aria-describedby={code && error ? "coupon-err" : undefined} placeholder="WELCOME10" />
        <button type="submit" className="btn btn-sm shrink-0" style={{ background: "var(--paper-ink)", color: "var(--paper)", minHeight: 48 }}>Apply</button>
      </div>
      {code && error && <p id="coupon-err" className="error-text" role="alert">{error} <button type="button" className="underline" onClick={() => onApply(null)}>Clear</button></p>}
    </form>
  );
}
