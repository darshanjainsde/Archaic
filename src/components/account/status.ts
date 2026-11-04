import type { OrderStatus, PaymentStatus } from "@prisma/client";

export const STATUS_TEXT: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Being prepared",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
};

export const PAYMENT_TEXT: Record<PaymentStatus, string> = {
  PENDING: "Not paid yet",
  PAID: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  COD_PENDING: "Pay on delivery",
};

export const FLOW: OrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

export function statusTone(s: OrderStatus): string {
  if (s === "DELIVERED") return "bg-accent text-accent-ink";
  if (s === "CANCELLED" || s === "REFUNDED" || s === "RETURNED") return "bg-surface text-muted";
  if (s === "PENDING_PAYMENT" || s === "RETURN_REQUESTED") return "bg-sale text-bg";
  return "bg-ink text-bg";
}
