import Link from "next/link";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

export function PageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && <Link href={back.href} className="text-btn -ml-3 mb-2 text-muted hover:text-ink">← {back.label}</Link>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] md:text-[28px]">{title}</h1>
          {description && <p className="mt-1 max-w-[65ch] text-[15px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Panel: radius 12, padding 16 phone / 20 desktop, 16 under the header. */
export function Panel({ title, children, className, actions, description, id }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode; description?: string; id?: string }) {
  return (
    <section id={id} className={cn("min-w-0 scroll-mt-20 rounded-xl border border-black/10 bg-surface p-4 md:p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-[17px] font-semibold">{title}</h2>}
            {description && <p className="mt-1 text-[14px] leading-5 text-muted">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const ORDER_TONE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-sky-100 text-sky-900",
  PROCESSING: "bg-sky-100 text-sky-900",
  SHIPPED: "bg-indigo-50 text-indigo-900",
  OUT_FOR_DELIVERY: "bg-indigo-50 text-indigo-900",
  DELIVERED: "bg-emerald-100 text-emerald-900",
  CANCELLED: "bg-neutral-200 text-neutral-700",
  RETURN_REQUESTED: "bg-orange-100 text-orange-900",
  RETURNED: "bg-neutral-200 text-neutral-700",
  REFUNDED: "bg-neutral-200 text-neutral-700",
};
const LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment", CONFIRMED: "Confirmed", PROCESSING: "Processing", SHIPPED: "Shipped", OUT_FOR_DELIVERY: "Out for delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled", RETURN_REQUESTED: "Return requested", RETURNED: "Returned", REFUNDED: "Refunded",
};
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold", ORDER_TONE[status])}>{LABELS[status]}</span>;
}
const PAY_TONE: Record<PaymentStatus, string> = { PENDING: "bg-amber-100 text-amber-900", PAID: "bg-emerald-100 text-emerald-900", FAILED: "bg-red-100 text-red-900", REFUNDED: "bg-neutral-200 text-neutral-700", COD_PENDING: "bg-neutral-100 text-neutral-800" };
const PAY_LABEL: Record<PaymentStatus, string> = { PENDING: "Unpaid", PAID: "Paid", FAILED: "Failed", REFUNDED: "Refunded", COD_PENDING: "COD due" };
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold", PAY_TONE[status])}>{PAY_LABEL[status]}</span>;
}

export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" }) {
  const t = { neutral: "bg-neutral-100 text-neutral-800", green: "bg-emerald-100 text-emerald-900", amber: "bg-amber-100 text-amber-900", red: "bg-red-100 text-red-900" }[tone];
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold", t)}>{children}</span>;
}

export function Pagination({ page, pages, makeHref }: { page: number; pages: number; makeHref: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-2 text-[14px]">
      <span className="text-muted">Page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 ? <Link className="btn btn-ghost btn-sm" href={makeHref(page - 1)}>Previous</Link> : <span className="btn btn-ghost btn-sm opacity-40">Previous</span>}
        {page < pages ? <Link className="btn btn-ghost btn-sm" href={makeHref(page + 1)}>Next</Link> : <span className="btn btn-ghost btn-sm opacity-40">Next</span>}
      </div>
    </nav>
  );
}

/** A table that scrolls inside its own box. `hideOnPhone` hides it below 768 px when a card list replaces it. */
export function Table({ children, hideOnPhone }: { children: React.ReactNode; hideOnPhone?: boolean }) {
  return (
    <div className={cn("overflow-x-auto overscroll-x-contain rounded-xl border border-black/10 bg-surface", hideOnPhone && "hidden md:block")}>
      <table className="w-full min-w-[640px] border-collapse text-left text-[14px] [&_td]:border-t [&_td]:border-black/5 [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-3 [&_th]:text-[13px] [&_th]:font-semibold [&_th]:text-muted [&_td>a]:inline-flex [&_td>a]:min-h-11 [&_td>a]:items-center">
        {children}
      </table>
    </div>
  );
}

/** Stacked cards that replace a table on phones (below 768 px). */
export function CardList({ children, label }: { children: React.ReactNode; label: string }) {
  return <ul aria-label={label} className="space-y-3 md:hidden">{children}</ul>;
}
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <li className={cn("rounded-xl border border-black/10 bg-surface", className)}>{children}</li>;
}

export function Toggle({ name, label, defaultChecked, checked, onChange, hint }: { name?: string; label: string; defaultChecked?: boolean; checked?: boolean; onChange?: (v: boolean) => void; hint?: string }) {
  return (
    <label className="check-row">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
      />
      <span className="min-w-0">
        <span className="block text-[15px] font-medium leading-6">{label}</span>
        {hint && <span className="mt-1 block text-[14px] leading-5 text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** One choice out of a few, each with a one-line explanation (radio cards). */
export function ChoiceCards<T extends string>({ name, value, onChange, options, legend }: { name: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; hint: string; icon?: React.ReactNode }[]; legend: string }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.value} className={cn("flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors", value === o.value ? "border-ink bg-black/[.03] ring-1 ring-ink" : "border-black/15 hover:border-black/30")}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]" />
            {o.icon && <span className="shrink-0" aria-hidden>{o.icon}</span>}
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-6">{o.label}</span>
              <span className="mt-1 block text-[14px] leading-5 text-muted">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-black/15 bg-surface p-8 text-center text-[15px] text-muted">{children}</div>;
}

/** One order as a tappable card (phones). Key facts first: number, total, status. */
export function OrderCard({ o }: { o: { id: string; number: string; createdAt: Date; total: number; status: OrderStatus; paymentStatus: PaymentStatus; paymentMethod: string; email?: string; isGift?: boolean; user: { name: string }; items?: number } }) {
  return (
    <Card>
      <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 p-4">
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-[16px] font-semibold">{o.number}</span>
            <span className="text-[16px] font-semibold tabular-nums">{formatMoney(o.total)}</span>
          </span>
          <span className="block truncate text-[14px] text-muted">{o.user.name} · {formatDate(o.createdAt, true)}{o.items !== undefined ? ` · ${o.items} item${o.items === 1 ? "" : "s"}` : ""}{o.isGift ? " · Gift" : ""}</span>
          <span className="mt-2 flex flex-wrap items-center gap-2"><OrderStatusBadge status={o.status} /><PaymentBadge status={o.paymentStatus} /><span className="text-[13px] text-muted">{o.paymentMethod}</span></span>
        </span>
        <ChevronRight size={20} aria-hidden className="shrink-0 text-muted" />
      </Link>
    </Card>
  );
}
