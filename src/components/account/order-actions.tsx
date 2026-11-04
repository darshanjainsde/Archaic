"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cancelOrder, requestReturn, buyAgainLines } from "@/actions/account";
import { cart } from "@/lib/cart-store";

export function OrderActions({ number, canCancel, paid, canReturn, returnDays }: { number: string; canCancel: boolean; paid: boolean; canReturn: boolean; returnDays: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const cancelDlg = useRef<HTMLDialogElement>(null);
  const returnDlg = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, dlg?: HTMLDialogElement | null) =>
    start(async () => {
      setErr(null);
      const r = await fn();
      if (!r.ok) { setErr(r.error ?? "Something went wrong"); return; }
      dlg?.close();
      setReason("");
      toast.success(r.message ?? "Done");
      router.refresh();
    });

  const buyAgain = () =>
    start(async () => {
      try {
        const { lines, skipped } = await buyAgainLines(number);
        if (lines.length === 0) { toast.error("These items are no longer available"); return; }
        for (const l of lines) cart.add(l);
        toast.success(skipped ? `Added ${lines.length} item(s). ${skipped} are no longer available.` : "Added to your bag");
        router.push("/cart");
      } catch { toast.error("Could not add these items"); }
    });

  const dlgClass = "w-[min(92vw,480px)] bg-paper p-6 text-paper-ink backdrop:bg-black/55";
  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" className="btn btn-ghost" onClick={buyAgain} disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />}Buy again</button>
      {canCancel && <button type="button" className="btn btn-ghost" onClick={() => { setErr(null); cancelDlg.current?.showModal(); }}>Cancel order</button>}
      {canReturn && <button type="button" className="btn btn-ghost" onClick={() => { setErr(null); returnDlg.current?.showModal(); }}>Request a return</button>}

      <dialog ref={cancelDlg} className={dlgClass} style={{ borderRadius: "var(--radius)", margin: "auto" }} aria-labelledby="cancel-h">
        <h2 id="cancel-h" className="text-3xl">Cancel this order?</h2>
        <p className="mt-3 text-[16px]">{paid ? "You will receive a full refund to the original payment method within 5–7 working days." : "Nothing has been charged for this order."}</p>
        <label htmlFor="cancel-reason" className="label mt-4">Reason (optional)</label>
        <textarea id="cancel-reason" className="field min-h-20" style={{ ["--ink" as string]: "var(--paper-ink)" }} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
        {err && <p className="error-text" role="alert">{err}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn" style={{ background: "var(--paper-ink)", color: "var(--paper)" }} disabled={pending} onClick={() => run(() => cancelOrder(number, reason), cancelDlg.current)}>
            {pending && <Loader2 size={16} className="animate-spin" />} Yes, cancel order
          </button>
          <button type="button" className="btn" onClick={() => cancelDlg.current?.close()}>Keep my order</button>
        </div>
      </dialog>

      <dialog ref={returnDlg} className={dlgClass} style={{ borderRadius: "var(--radius)", margin: "auto" }} aria-labelledby="return-h">
        <h2 id="return-h" className="text-3xl">Request a return</h2>
        <p className="mt-3 text-[16px]">Returns are accepted within {returnDays} days of delivery for unused items. Tell us what happened.</p>
        <label htmlFor="return-reason" className="label mt-4">What went wrong?</label>
        <textarea id="return-reason" className="field min-h-24" style={{ ["--ink" as string]: "var(--paper-ink)" }} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby={err ? "return-err" : undefined} />
        {err && <p id="return-err" className="error-text" role="alert">{err}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn" style={{ background: "var(--paper-ink)", color: "var(--paper)" }} disabled={pending} onClick={() => run(() => requestReturn(number, reason), returnDlg.current)}>
            {pending && <Loader2 size={16} className="animate-spin" />} Send request
          </button>
          <button type="button" className="btn" onClick={() => returnDlg.current?.close()}>Close</button>
        </div>
      </dialog>
    </div>
  );
}
