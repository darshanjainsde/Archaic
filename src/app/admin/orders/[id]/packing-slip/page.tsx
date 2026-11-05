import { notFound } from "next/navigation";
import { BoxPlanView } from "@/components/box/plan-view";
import type { BoxSnapshot } from "@/lib/box/core";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import type { SelectionSnapshot, ShippingAddress } from "@/lib/types";
import { PrintButton } from "@/components/admin/print-button";

export const metadata = { title: "Packing slip" };

export default async function PackingSlip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [o, s] = await Promise.all([db.order.findUnique({ where: { id }, include: { items: true } }), getSettings()]);
  if (!o) notFound();
  const a = o.shippingAddress as unknown as ShippingAddress;
  return (
    <div className="mx-auto max-w-[760px] bg-white p-6 text-[14px] text-black print:p-0 [&_*]:!shadow-none">
      <style>{`@media print { aside, header, nav { display: none !important; } main { padding: 0 !important; max-width: none !important; } body { background: #fff !important; } }`}</style>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="text-xl font-semibold">{s.store.name}</div>
          <div className="text-[13px] text-neutral-600">{s.store.address}{s.store.gstin ? ` · GSTIN ${s.store.gstin}` : ""}</div>
          <div className="text-[13px] text-neutral-600">{s.store.email} {s.store.phone}</div>
        </div>
        <PrintButton />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-[12px] font-semibold text-neutral-600">Ship to</div>
          <div className="mt-1 font-semibold">{a.name}</div>
          <div>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</div>
          {a.landmark && <div>Near {a.landmark}</div>}
          <div>{a.city}, {a.state} {a.pincode}</div>
          <div>Phone {a.phone}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">{o.number}</div>
          <div>{formatDate(o.createdAt)}</div>
          <div className="mt-1 font-semibold">{o.paymentMethod === "COD" ? `COD — collect ${formatMoney(o.total)}` : "Prepaid"}</div>
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead><tr className="border-b border-black text-left"><th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-center">Packed</th></tr></thead>
        <tbody>
          {o.items.map((it) => (
            <tr key={it.id} className="border-b border-neutral-300 align-top">
              <td className="py-2">
                <b>{it.name}</b>
                <div className="text-[13px]">{(it.selections as SelectionSnapshot[]).map((x) => `${x.group}: ${x.value}`).join(" · ")}</div>
                {it.personalization && <div className="text-[13px]">Personalise: “{it.personalization}”</div>}
              </td>
              <td className="py-2 text-right text-lg font-semibold">{it.quantity}</td>
              <td className="py-2 text-center">☐</td>
            </tr>
          ))}
        </tbody>
      </table>
      {o.items.filter((it) => it.box).map((it) => (
        <section key={it.id} className="@container mt-6 break-inside-avoid border border-black p-4">
          <h2 className="mb-3 text-lg font-semibold">Packing plan · {it.name}</h2>
          <BoxPlanView box={it.box as unknown as BoxSnapshot} quantity={it.quantity} variant="print" />
          <p className="mt-3 text-[12px]">Photograph the packed box and send it to the customer before sealing.</p>
        </section>
      ))}
      {o.isGift && <div className="mt-6 border border-black p-3"><b>Gift wrap</b>{o.giftMessage && <p className="mt-1 whitespace-pre-line text-[15px]">Card message: “{o.giftMessage}”</p>}<p className="mt-1 text-[12px]">Do not include the invoice or prices in this parcel.</p></div>}
      {o.notes && <p className="mt-4"><b>Customer note:</b> {o.notes}</p>}
    </div>
  );
}
