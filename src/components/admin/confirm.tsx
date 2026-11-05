"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

type Ask = { title: string; body?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
type Pending = Ask & { resolve: (ok: boolean) => void };

const Ctx = createContext<((a: Ask) => Promise<boolean>) | null>(null);

/**
 * In-page confirm dialog (replaces window.confirm). Rendered inside the admin root so it gets the admin
 * font and colours. Uses <dialog>.showModal(): focus is trapped, Escape cancels, the page behind is inert.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [p, setP] = useState<Pending | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  const ask = useCallback((a: Ask) => new Promise<boolean>((resolve) => setP({ ...a, resolve })), []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (p && !d.open) d.showModal();
    if (!p && d.open) d.close();
  }, [p]);

  const done = (ok: boolean) => {
    p?.resolve(ok);
    setP(null);
  };

  return (
    <Ctx.Provider value={ask}>
      {children}
      <dialog
        ref={ref}
        aria-labelledby="confirm-title"
        onCancel={(e) => { e.preventDefault(); done(false); }}
        onClick={(e) => { if (e.target === e.currentTarget) done(false); }}
        className="m-0 mt-auto w-full max-w-none overscroll-contain rounded-t-xl bg-surface p-0 text-ink shadow-xl sm:m-auto sm:w-[min(440px,calc(100%-32px))] sm:rounded-xl"
      >
        {p && (
          <div className="p-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:p-6">
            <div className="flex items-start gap-3">
              {p.danger && <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-sale"><AlertTriangle size={18} aria-hidden /></span>}
              <div className="min-w-0">
                <h2 id="confirm-title" className="text-[18px] font-semibold leading-6">{p.title}</h2>
                {p.body && <p className="mt-2 text-[15px] leading-6 text-muted">{p.body}</p>}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-ghost w-full sm:w-auto" onClick={() => done(false)} autoFocus>{p.cancelLabel ?? "Cancel"}</button>
              <button type="button" className={`btn w-full sm:w-auto ${p.danger ? "btn-danger" : "btn-primary"}`} onClick={() => done(true)}>{p.confirmLabel ?? "Confirm"}</button>
            </div>
          </div>
        )}
      </dialog>
    </Ctx.Provider>
  );
}

/** const confirm = useConfirm(); if (await confirm({ title: "Delete?", danger: true })) … */
export function useConfirm() {
  const ask = useContext(Ctx);
  return useCallback(
    (a: Ask) => (ask ? ask(a) : Promise.resolve(window.confirm([a.title, a.body].filter(Boolean).join("\n\n")))),
    [ask],
  );
}
