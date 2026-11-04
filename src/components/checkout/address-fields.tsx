"use client";
import { INDIAN_STATES } from "@/lib/utils";

export type AddressForm = { name: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; pincode: string };
export const EMPTY_ADDRESS: AddressForm = { name: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "" };

/** Controlled address inputs. `errors` keys: name, phone, line1, ... ; `prefix` namespaces ids. */
export function AddressFields({ value, onChange, errors = {}, prefix = "addr" }: { value: AddressForm; onChange: (v: AddressForm) => void; errors?: Record<string, string>; prefix?: string }) {
  const set = (k: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const f = (k: keyof AddressForm, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, className = "") => {
    const id = `${prefix}-${k}`;
    const err = errors[k];
    return (
      <div className={className}>
        <label htmlFor={id} className="label">{label}</label>
        <input id={id} name={k} className="field" value={value[k]} onChange={set(k)} aria-invalid={Boolean(err)} aria-describedby={err ? `${id}-err` : undefined} {...extra} />
        {err && <p id={`${id}-err`} className="error-text">{err}</p>}
      </div>
    );
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {f("name", "Full name", { autoComplete: "name", required: true, maxLength: 80 })}
      {f("phone", "Mobile number", { autoComplete: "tel-national", inputMode: "tel", required: true, maxLength: 14, placeholder: "10-digit mobile" })}
      {f("line1", "House / flat, street", { autoComplete: "address-line1", required: true, maxLength: 160 }, "sm:col-span-2")}
      {f("line2", "Area, locality (optional)", { autoComplete: "address-line2", maxLength: 160 }, "sm:col-span-2")}
      {f("landmark", "Landmark (optional)", { maxLength: 100 })}
      {f("pincode", "Pincode", { autoComplete: "postal-code", inputMode: "numeric", required: true, maxLength: 6, pattern: "[0-9]{6}" })}
      {f("city", "City", { autoComplete: "address-level2", required: true, maxLength: 60 })}
      <div>
        <label htmlFor={`${prefix}-state`} className="label">State</label>
        <select id={`${prefix}-state`} name="state" className="field" value={value.state} onChange={set("state")} autoComplete="address-level1" required aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? `${prefix}-state-err` : undefined}>
          <option value="">Choose a state</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {errors.state && <p id={`${prefix}-state-err`} className="error-text">{errors.state}</p>}
      </div>
    </div>
  );
}
