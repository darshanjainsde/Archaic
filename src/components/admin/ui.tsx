import Link from "next/link";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && <Link href={back.href} className="mb-2 inline-block text-[14px] text-muted hover:text-ink">← {back.label}</Link>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-[28px]">{title}</h1>
          {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, children, className, actions, description }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode; description?: string }) {
  return (
    <section className={cn("rounded-lg border border-black/10 bg-surface p-4 md:p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h2 className="text-[16px] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          {actions}
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
  return <span className={cn("inline-block whitespace-nowrap rounded px-2 py-0.5 text-[12px] font-semibold", ORDER_TONE[status])}>{LABELS[status]}</span>;
}
const PAY_TONE: Record<PaymentStatus, string> = { PENDING: "bg-amber-100 text-amber-900", PAID: "bg-emerald-100 text-emerald-900", FAILED: "bg-red-100 text-red-900", REFUNDED: "bg-neutral-200 text-neutral-700", COD_PENDING: "bg-neutral-100 text-neutral-800" };
const PAY_LABEL: Record<PaymentStatus, string> = { PENDING: "Unpaid", PAID: "Paid", FAILED: "Failed", REFUNDED: "Refunded", COD_PENDING: "COD due" };
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={cn("inline-block whitespace-nowrap rounded px-2 py-0.5 text-[12px] font-semibold", PAY_TONE[status])}>{PAY_LABEL[status]}</span>;
}

export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" }) {
  const t = { neutral: "bg-neutral-100 text-neutral-800", green: "bg-emerald-100 text-emerald-900", amber: "bg-amber-100 text-amber-900", red: "bg-red-100 text-red-900" }[tone];
  return <span className={cn("inline-block whitespace-nowrap rounded px-2 py-0.5 text-[12px] font-semibold", t)}>{children}</span>;
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

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-left text-[14px] [&_td]:border-t [&_td]:border-black/5 [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-[12px] [&_th]:font-semibold [&_th]:text-muted">
        {children}
      </table>
    </div>
  );
}

export function Toggle({ name, label, defaultChecked, checked, onChange, hint }: { name?: string; label: string; defaultChecked?: boolean; checked?: boolean; onChange?: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]"
      />
      <span>
        <span className="text-[14px] font-medium">{label}</span>
        {hint && <span className="block text-[13px] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-black/15 bg-surface p-8 text-center text-[15px] text-muted">{children}</div>;
}
