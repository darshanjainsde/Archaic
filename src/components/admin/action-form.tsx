"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/admin-types";

type FormAction = (prev: ActionResult<{ redirect?: string }> | null, fd: FormData) => Promise<ActionResult<{ redirect?: string }>>;

/** Form bound to a server action: shows a toast, field errors via context-free data attrs, and follows data.redirect. */
export function ActionForm({ action, children, className, resetOnSuccess }: { action: FormAction; children: React.ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const [state, formAction] = useActionState(action, null);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Saved");
      if (resetOnSuccess) ref.current?.reset();
      if (state.data?.redirect) router.push(state.data.redirect);
      else router.refresh();
    } else toast.error(state.error);
  }, [state, router, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      {children}
      {state && !state.ok && state.fieldErrors && (
        <ul className="mt-3 space-y-0.5" role="alert">
          {Object.entries(state.fieldErrors).map(([k, v]) => <li key={k} className="error-text">{k}: {v}</li>)}
        </ul>
      )}
    </form>
  );
}

/** A button that runs a server action after an optional confirm. */
export function ConfirmButton({ action, confirmText, children, className }: { action: () => Promise<ActionResult<{ redirect?: string }>>; confirmText?: string; children: React.ReactNode; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (confirmText && !confirm(confirmText)) return;
        const r = await action();
        if (r.ok) {
          toast.success(r.message ?? "Done");
          if (r.data?.redirect) router.push(r.data.redirect);
          else router.refresh();
        } else toast.error(r.error);
      }}
    >
      {children}
    </button>
  );
}
