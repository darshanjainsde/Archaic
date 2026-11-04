import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { Img } from "@/components/ui/img";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { StatusTag } from "./status-tag";

type O = { number: string; status: OrderStatus; total: number; createdAt: Date; items: { image: string | null; name: string }[] };

export function OrderRow({ order, itemCount }: { order: O; itemCount?: number }) {
  return (
    <li>
      <Link href={`/account/orders/${order.number}`} className="grid grid-cols-[1fr_auto] items-center gap-4 bg-surface p-4 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_10%,var(--surface))] md:grid-cols-[auto_1fr_auto]" style={{ borderRadius: "var(--radius)" }}>
        <div className="col-span-2 flex -space-x-3 md:col-span-1">
          {order.items.slice(0, 4).map((i, k) => (
            <div key={k} className="relative h-16 w-14 overflow-hidden bg-bg ring-2 ring-[var(--surface)]"><Img src={i.image} alt={i.name} fill sizes="56px" className="object-cover" /></div>
          ))}
        </div>
        <div className="min-w-0">
          <p className="font-semibold tabular-nums">{order.number}</p>
          <p className="text-[15px] text-muted">{formatDate(order.createdAt)}{itemCount ? ` · ${itemCount} item${itemCount > 1 ? "s" : ""}` : ""}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusTag status={order.status} />
          <span className="font-semibold tabular-nums">{formatMoney(order.total)}</span>
        </div>
      </Link>
    </li>
  );
}
