"use client";
import { Loader2 } from "lucide-react";
import { useConfirm } from "./confirm";

/**
 * Sticky bottom bar for long editors. Appears only while there are unsaved changes (or a save is running).
 * Pass `submit` to render the Save button as type="submit" (inside a <form>), otherwise `onSave` is called.
 */
export function SaveBar({ dirty, pending, onSave, onDiscard, submit, saveLabel = "Save changes" }: { dirty: boolean; pending: boolean; onSave?: () => void; onDiscard?: () => void; submit?: boolean; saveLabel?: string }) {
  const confirm = useConfirm();
  const show = dirty || pending;
  return (
    <>
      {/* spacer so the last field is never covered by the bar */}
      <div aria-hidden className={show ? "h-24" : "h-0"} />
      <div
        role="region"
        aria-label="Unsaved changes"
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-surface/95 shadow-[0_-4px_16px_rgb(0_0_0/.06)] backdrop-blur transition-[translate,visibility] duration-200 lg:left-[240px] ${show ? "visible translate-y-0" : "pointer-events-none invisible translate-y-full"}`}
        inert={!show}
      >
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:px-6">
          <p className="min-w-0 flex-1 text-[15px] font-medium" aria-live="polite">{pending ? "Saving…" : "Unsaved changes"}</p>
          {onDiscard && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pending}
              onClick={async () => { if (await confirm({ title: "Discard your changes?", body: "Everything you changed since the last save will be undone.", confirmLabel: "Discard", danger: true })) onDiscard(); }}
            >
              Discard
            </button>
          )}
          <button type={submit ? "submit" : "button"} className="btn btn-primary" disabled={pending} onClick={submit ? undefined : onSave}>
            {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {pending ? "Saving…" : saveLabel}
          </button>
        </div>
      </div>
    </>
  );
}
