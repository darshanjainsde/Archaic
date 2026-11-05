import type { OrderStatus, Prisma } from "@prisma/client";
import type { BoxSnapshot } from "@/lib/box/core";
import { BoxPlanView } from "./plan-view";
import { VoiceNote } from "./voice-note";

const LOCKED: OrderStatus[] = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED", "REFUNDED"];

/** Custom boxes in a customer's order: what goes where, the card, and the voice-note recorder. */
export function OrderBoxes({ number, status, items, ownAddress }: { number: string; status: OrderStatus; items: { id: string; name: string; quantity: number; box: Prisma.JsonValue | null }[]; ownAddress: string }) {
  const boxes = items.filter((i) => i.box);
  if (!boxes.length) return null;
  return (
    <section aria-label="Your gift box" className="space-y-6">
      {boxes.map((i) => {
        const box = i.box as unknown as BoxSnapshot;
        return (
          <div key={i.id} className="@container space-y-4 bg-paper p-5 text-paper-ink md:p-6" style={{ borderRadius: "var(--radius)" }}>
            <h2 className="text-2xl">{i.name}{i.quantity > 1 ? ` × ${i.quantity}` : ""}</h2>
            <BoxPlanView box={box} quantity={i.quantity} variant="customer" ownAddress={ownAddress} />
            {box.card.voice && box.voice?.token && status !== "PENDING_PAYMENT" && <VoiceNote number={number} itemId={i.id} current={box.voice.url ?? null} locked={LOCKED.includes(status)} />}
            <p className="text-[14px] text-muted">We send you a photo of the packed box before we seal it.</p>
          </div>
        );
      })}
    </section>
  );
}
