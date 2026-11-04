"use client";
import { useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { ActionForm } from "./action-form";
import { updateOrderStatus } from "@/actions/admin/orders";
import { SubmitButton } from "@/components/ui/submit-button";

const LABEL: Record<OrderStatus, string> = { PENDING_PAYMENT: "Awaiting payment", CONFIRMED: "Confirmed", PROCESSING: "Processing (being packed)", SHIPPED: "Shipped", OUT_FOR_DELIVERY: "Out for delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled", RETURN_REQUESTED: "Return requested", RETURNED: "Returned", REFUNDED: "Refunded" };

export function OrderStatusForm({ id, status, allowed, paid, tracking, eta }: { id: string; status: OrderStatus; allowed: OrderStatus[]; paid: boolean; tracking: { courier: string; trackingNumber: string; trackingUrl: string }; eta: string }) {
  const [next, setNext] = useState<OrderStatus | "">("");
  const showTracking = next === "SHIPPED" || ["SHIPPED", "OUT_FOR_DELIVERY"].includes(status) || !!tracking.trackingNumber;
  return (
    <ActionForm action={updateOrderStatus} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="label" htmlFor="ns">Change status</label>
        <select id="ns" name="status" className="field" value={next} onChange={(e) => setNext(e.target.value as OrderStatus)}>
          <option value="">Keep as {LABEL[status]}</option>
          {allowed.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
        </select>
        {allowed.length === 0 && <p className="hint">This order is closed.</p>}
      </div>
      {next === "CANCELLED" && paid && <p className="rounded-md bg-amber-50 p-2 text-[13px] text-amber-950">This order is paid. After cancelling, refund it in your payment gateway dashboard and then use “Mark refunded”.</p>}
      {next === "REFUNDED" && <p className="rounded-md bg-amber-50 p-2 text-[13px] text-amber-950">This only records the refund. Issue the money back from the Razorpay / Cashfree dashboard.</p>}
      {showTracking && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="cr">Courier</label><input id="cr" name="courier" className="field" defaultValue={tracking.courier} placeholder="Delhivery, Blue Dart…" /></div>
          <div><label className="label" htmlFor="tn">Tracking number</label><input id="tn" name="trackingNumber" className="field" defaultValue={tracking.trackingNumber} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="tu">Tracking link</label><input id="tu" name="trackingUrl" type="url" className="field" defaultValue={tracking.trackingUrl} placeholder="https://…" /></div>
          {next === "SHIPPED" && <label className="flex items-center gap-2 text-[13px] sm:col-span-2"><input type="checkbox" name="skipTracking" className="h-4 w-4" /> Ship without a tracking number</label>}
        </div>
      )}
      <div><label className="label" htmlFor="eta">Estimated delivery</label><input id="eta" name="estimatedDelivery" type="date" className="field" defaultValue={eta} /></div>
      <div><label className="label" htmlFor="nt">Note for the timeline</label><textarea id="nt" name="note" rows={2} className="field" placeholder="Optional. Shown to the customer unless private." /></div>
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="private" className="h-4 w-4" /> Keep this note private</label>
      <SubmitButton className="w-full" pendingText="Updating…">Update order</SubmitButton>
      <p className="hint">Shipped, delivered, cancelled and refunded updates email the customer.</p>
    </ActionForm>
  );
}
