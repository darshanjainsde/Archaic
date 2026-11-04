import type { OrderStatus } from "@prisma/client";
import { STATUS_TEXT, statusTone } from "./status";

export function StatusTag({ status }: { status: OrderStatus }) {
  return <span className={`inline-block px-2.5 py-1 text-[14px] font-semibold ${statusTone(status)}`} style={{ borderRadius: "var(--radius)" }}>{STATUS_TEXT[status]}</span>;
}
