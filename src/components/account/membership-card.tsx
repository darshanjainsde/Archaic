import Link from "next/link";
import type { MembershipTier } from "@/lib/settings-schema";
import { formatMoney } from "@/lib/money";

export function MembershipCard({ programme, current, next, progress, remaining, spend, compact = false }: { programme: string; current: MembershipTier; next: MembershipTier | null; progress: number; remaining: number; spend: number; compact?: boolean }) {
  return (
    <section className="label-panel p-6 md:p-8" aria-label="Your membership">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[15px] opacity-80">{programme}</p>
          <h2 className="text-5xl md:text-6xl">{current.name}</h2>
        </div>
        <p className="text-[16px]">{current.discountPct > 0 ? <><b>{current.discountPct}% off</b> every order</> : "Your first tier"}</p>
      </div>
      <div className="perforated my-5" aria-hidden />
      <p className="text-[16px]">Lifetime spend <b className="tabular-nums">{formatMoney(spend)}</b></p>
      {next ? (
        <>
          <div className="mt-3 h-3 w-full" style={{ background: "color-mix(in srgb, var(--paper-ink) 14%, transparent)" }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={`Progress to ${next.name}`}>
            <div className="h-full" style={{ width: `${Math.round(progress * 100)}%`, background: "var(--paper-ink)" }} />
          </div>
          <p className="mt-2 text-[16px]">Spend <b className="tabular-nums">{formatMoney(remaining)}</b> more to reach <b>{next.name}</b>{next.discountPct ? ` and ${next.discountPct}% off` : ""}.</p>
        </>
      ) : (
        <p className="mt-2 text-[16px]">You are at our highest tier. Thank you.</p>
      )}
      {!compact && current.perks.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-[16px]">{current.perks.map((p) => <li key={p}>{p}</li>)}</ul>
      )}
      {compact && <Link href="/account/membership" className="tap-y mt-2 text-[16px] font-semibold underline">See all tiers and perks</Link>}
    </section>
  );
}
