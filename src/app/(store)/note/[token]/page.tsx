import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { BoxSnapshot } from "@/lib/box/core";

export const metadata: Metadata = { title: "A voice note for you", robots: { index: false, follow: false } };

/** Opened from the QR on a gift box's card. Only someone holding the card has the link. */
export default async function VoiceNotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-z0-9]{12,40}$/i.test(token)) notFound();
  const item = await db.orderItem.findFirst({ where: { box: { path: ["voice", "token"], equals: token } }, select: { box: true } });
  const box = item?.box as BoxSnapshot | null;
  if (!box?.voice) notFound();
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-16">
      <div className="w-full max-w-lg bg-paper p-8 text-center text-paper-ink shadow-[0_30px_60px_-36px_rgb(43_34_22/.45)]" style={{ borderRadius: "var(--radius)" }}>
        <p className="text-[12px] font-semibold uppercase tracking-[.14em] text-muted">A voice note{box.card.from ? ` from ${box.card.from}` : ""}</p>
        <h1 className="mt-3 text-[40px]">{box.card.to ? `For ${box.card.to}` : "For you"}</h1>
        {box.voice.url ? (
          <audio controls autoPlay={false} src={box.voice.url} className="mt-8 w-full" preload="metadata">Your browser can’t play this recording.</audio>
        ) : (
          <p className="mt-6 text-muted">The voice note hasn’t been added yet. Scan the card again a little later.</p>
        )}
      </div>
    </div>
  );
}
