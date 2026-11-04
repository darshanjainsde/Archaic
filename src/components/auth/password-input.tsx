"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput({ id, name, error, autoComplete, describedBy, label }: { id: string; name: string; error?: string; autoComplete: string; describedBy?: string; label: string }) {
  const [show, setShow] = useState(false);
  const desc = [error ? `${id}-err` : null, describedBy].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input id={id} name={name} type={show ? "text" : "password"} className="field pr-12" autoComplete={autoComplete} required aria-invalid={Boolean(error)} aria-describedby={desc} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 grid w-12 place-items-center" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p id={`${id}-err`} className="error-text">{error}</p>}
    </div>
  );
}

export function TextField({ id, name, label, error, defaultValue, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; name: string; label: string; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={name} className="field" defaultValue={defaultValue} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
      {error && <p id={`${id}-err`} className="error-text">{error}</p>}
    </div>
  );
}

export function FormAlert({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <p role={error ? "alert" : "status"} className={`p-4 text-[15px] ${error ? "bg-surface font-semibold text-sale" : "bg-surface"}`} style={{ borderRadius: "var(--radius)" }}>
      {error ?? message}
    </p>
  );
}
