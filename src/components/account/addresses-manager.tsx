"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { saveAddressSafe, deleteAddress, setDefaultAddress } from "@/actions/account";
import { AddressFields, EMPTY_ADDRESS, type AddressForm } from "@/components/checkout/address-fields";
import { addressSchema, fieldErrors } from "@/lib/address";

type A = AddressForm & { id: string; isDefault: boolean };

export function AddressesManager({ addresses, max = 10 }: { addresses: A[]; max?: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(addresses.length === 0 ? "new" : null);
  const [form, setForm] = useState<AddressForm>(EMPTY_ADDRESS);
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const open = (a?: A) => {
    setErrors({}); setErr(null);
    if (a) { setForm({ name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "", city: a.city, state: a.state, pincode: a.pincode }); setIsDefault(a.isDefault); setEditing(a.id); }
    else { setForm(EMPTY_ADDRESS); setIsDefault(addresses.length === 0); setEditing("new"); }
  };

  const save = () => {
    const v = addressSchema.safeParse(form);
    if (!v.success) { setErrors(fieldErrors(v.error)); return; }
    start(async () => {
      const r = await saveAddressSafe({ id: editing === "new" ? null : editing, address: form, isDefault });
      if (!r.ok) { setErr(r.error ?? "Could not save"); if (r.fieldErrors) setErrors(r.fieldErrors); return; }
      toast.success("Address saved");
      setEditing(null);
      router.refresh();
    });
  };

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => { const r = await fn(); if (!r.ok) toast.error(r.error ?? "Failed"); else { toast.success(msg); router.refresh(); } });

  return (
    <div className="space-y-4">
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="flex flex-col gap-3 bg-surface p-5" style={{ borderRadius: "var(--radius)" }}>
            <address className="text-[16px] not-italic">
              <b>{a.name}</b>{a.isDefault && <span className="ml-2 text-[15px] font-semibold text-muted">Default</span>}<br />
              {[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}<br />
              {a.city}, {a.state} {a.pincode}<br />{a.phone}
            </address>
            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
              <button type="button" className="underline" onClick={() => open(a)}>Edit</button>
              {!a.isDefault && <button type="button" className="underline" disabled={pending} onClick={() => act(() => setDefaultAddress(a.id), "Default address updated")}>Make default</button>}
              <button type="button" className="underline" disabled={pending} onClick={() => { if (confirm("Delete this address?")) act(() => deleteAddress(a.id), "Address deleted"); }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="bg-surface p-5 md:p-6" style={{ borderRadius: "var(--radius)" }}>
          <h2 className="mb-4 text-2xl">{editing === "new" ? "New address" : "Edit address"}</h2>
          <AddressFields value={form} onChange={setForm} errors={errors} prefix="acc" />
          <label className="mt-4 flex items-center gap-3 text-[16px]">
            <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Use as my default address
          </label>
          {err && <p className="error-text" role="alert">{err}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={save} disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />}Save address</button>
            {addresses.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>}
          </div>
        </div>
      ) : addresses.length < max ? (
        <button type="button" className="btn btn-primary" onClick={() => open()}>Add a new address</button>
      ) : (
        <p className="text-[16px] text-muted">You have saved the maximum of {max} addresses.</p>
      )}
    </div>
  );
}
