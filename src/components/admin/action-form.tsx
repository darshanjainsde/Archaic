"use client";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/admin-types";
import { useConfirm } from "./confirm";

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
        <ul className="mt-4 space-y-1 rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
          {Object.entries(state.fieldErrors).map(([k, v]) => <li key={k} className="text-[14px] text-sale">{v}</li>)}
        </ul>
      )}
    </form>
  );
}

/** A button that runs a server action, after an in-page confirm when confirmTitle/confirmText is given. */
export function ConfirmButton({ action, confirmText, confirmTitle, confirmLabel, danger, children, className }: { action: () => Promise<ActionResult<{ redirect?: string }>>; confirmText?: string; confirmTitle?: string; confirmLabel?: string; danger?: boolean; children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-busy={pending}
      onClick={async () => {
        if (confirmTitle || confirmText) {
          const ok = await confirm({ title: confirmTitle ?? confirmText!, body: confirmTitle ? confirmText : undefined, confirmLabel: confirmLabel ?? (danger ? "Delete" : "Yes, continue"), danger });
          if (!ok) return;
        }
        start(async () => {
          const r = await action();
          if (r.ok) {
            toast.success(r.message ?? "Done");
            if (r.data?.redirect) router.push(r.data.redirect);
            else router.refresh();
          } else toast.error(r.error);
        });
      }}
    >
      {children}
    </button>
  );
}
