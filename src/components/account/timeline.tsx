import type { OrderStatus } from "@prisma/client";
import { Check } from "lucide-react";
import { FLOW, STATUS_TEXT } from "./status";
import { formatDate } from "@/lib/utils";

type Ev = { status: OrderStatus; note: string | null; createdAt: Date };

/** Horizontal (desktop) / vertical (phone) progress stepper plus the full event history. */
export function OrderTimeline({ status, events, eta }: { status: OrderStatus; events: Ev[]; eta?: Date | null }) {
  const off = ["CANCELLED", "RETURN_REQUESTED", "RETURNED", "REFUNDED"].includes(status);
  const reachedAt = (s: OrderStatus) => events.filter((e) => e.status === s).at(-1)?.createdAt;
  const currentIdx = status === "PENDING_PAYMENT" ? -1 : FLOW.indexOf(status);
  const lastFlowIdx = off ? Math.max(-1, ...events.map((e) => FLOW.indexOf(e.status))) : currentIdx;

  return (
    <div className="space-y-8">
      <ol className="grid gap-0 md:grid-cols-5" aria-label="Order progress">
        {FLOW.map((s, i) => {
          const done = i <= lastFlowIdx;
          const current = !off && i === currentIdx;
          const at = reachedAt(s);
          return (
            <li key={s} className="relative flex gap-3 pb-6 md:flex-col md:gap-2 md:pb-0 md:pr-3" aria-current={current ? "step" : undefined}>
              {i < FLOW.length - 1 && <span aria-hidden className={`absolute left-[13px] top-7 h-[calc(100%-28px)] w-[3px] md:left-7 md:top-[13px] md:h-[3px] md:w-[calc(100%-28px)] ${i < lastFlowIdx ? "bg-accent" : "bg-surface"}`} />}
              <span className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full ${done ? "bg-accent text-accent-ink" : "border-2 border-[color-mix(in_oklab,var(--sale)_45%,var(--muted))] bg-paper"} ${current ? "ring-4 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]" : ""}`}>
                {done && <Check size={16} strokeWidth={3} aria-hidden />}
              </span>
              <span className="text-[15px]">
                <span className={done ? "font-semibold" : "text-muted"}>{STATUS_TEXT[s]}</span>
                {at && <span className="block text-[14px] text-muted">{formatDate(at, true)}</span>}
                {s === "DELIVERED" && !done && eta && !off && <span className="block text-[14px] text-muted">Expected by {formatDate(eta)}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {off && (
        <p className="bg-surface p-4 text-[16px] font-semibold" style={{ borderRadius: "var(--radius)" }}>
          This order is {STATUS_TEXT[status].toLowerCase()}.
        </p>
      )}
      <div>
        <h3 className="mb-3 text-xl">History</h3>
        <ul className="space-y-3">
          {[...events].reverse().map((e, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr] gap-x-4 text-[15px]">
              <span className="tabular-nums text-muted">{formatDate(e.createdAt, true)}</span>
              <span><b>{STATUS_TEXT[e.status]}</b>{e.note ? ` — ${e.note}` : ""}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
