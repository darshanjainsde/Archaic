import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/account/print-button";
import { PriceBreakdown } from "@/components/account/price-breakdown";
import type { SelectionSnapshot, ShippingAddress } from "@/lib/types";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };

export default async function Invoice({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}/invoice`);
  const order = await db.order.findUnique({ where: { number }, include: { items: true } });
  if (!order || order.userId !== user.id || order.status === "PENDING_PAYMENT") notFound();
  const s = await getSettings();
  const a = order.shippingAddress as ShippingAddress;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/account/orders/${number}`} className="text-[15px] underline">Back to order</Link>
        <PrintButton />
      </div>
      <article className="bg-white p-6 text-[#1c150d] md:p-10 print:p-0" style={{ ["--ink" as string]: "#1c150d", ["--muted" as string]: "#5a4d3d", ["--sale" as string]: "#1c150d" }}>
        <header className="flex flex-wrap justify-between gap-6">
          <div>
            <p className="font-display text-3xl">{s.store.name}</p>
            <p className="mt-2 whitespace-pre-line text-[15px]">{s.store.address}</p>
            {s.store.gstin && <p className="text-[15px]">GSTIN {s.store.gstin}</p>}
            {s.store.email && <p className="text-[15px]">{s.store.email}</p>}
          </div>
          <div className="text-right text-[15px]">
            <h1 className="text-4xl">Tax invoice</h1>
            <p className="mt-2">Invoice no. <b className="tabular-nums">{order.number}</b></p>
            <p>Date {formatDate(order.paidAt ?? order.createdAt)}</p>
            <p>{order.paymentMethod === "COD" ? "Cash on Delivery" : "Paid online"}</p>
          </div>
        </header>
        <section className="mt-8 text-[15px]">
          <p className="font-semibold">Billed and shipped to</p>
          <p>{a.name}, {a.phone}<br />{[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}<br />{a.city}, {a.state} {a.pincode}, {a.country}</p>
        </section>
        <table className="mt-8 w-full text-left text-[15px]">
          <thead><tr className="border-b-2 border-[#1c150d]"><th className="py-2">Item</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} className="border-b border-[#d8cfc0] align-top">
                <td className="py-2">{i.name}<div className="text-[14px] text-[#5a4d3d]">{(i.selections as SelectionSnapshot[]).map((x) => `${x.group}: ${x.value}`).join(" · ")}{i.personalization ? ` · Label: ${i.personalization}` : ""}</div></td>
                <td className="py-2 text-right tabular-nums">{formatMoney(i.unitPrice)}</td>
                <td className="py-2 text-right tabular-nums">{i.quantity}</td>
                <td className="py-2 text-right tabular-nums">{formatMoney(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto mt-6 max-w-sm"><PriceBreakdown o={order} /></div>
        <p className="mt-8 text-[14px] text-[#5a4d3d]">{s.commerce.taxNote}. This is a computer-generated invoice.</p>
      </article>
    </div>
  );
}
