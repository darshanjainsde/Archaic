import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { lifetimeSpend } from "@/lib/orders";
import { tierForSpend } from "@/lib/membership";
import { formatMoney } from "@/lib/money";
import { MembershipCard } from "@/components/account/membership-card";

export const metadata: Metadata = { title: "Membership", robots: { index: false } };

export default async function MembershipPage() {
  const user = await requireUser("/account/membership");
  const [s, spend] = await Promise.all([getSettings(), lifetimeSpend(user.id)]);
  if (!s.membership.enabled) return <div><h1 className="text-5xl">Membership</h1><p className="mt-4 text-lg">Our membership programme is resting for now.</p></div>;
  const t = tierForSpend(s.membership.tiers, spend);
  const tiers = [...s.membership.tiers].sort((a, b) => a.minSpend - b.minSpend);
  return (
    <div className="space-y-10">
      <h1 className="text-5xl md:text-6xl">{s.membership.name}</h1>
      <MembershipCard programme={s.membership.name} current={t.current} next={t.next} progress={t.progress} remaining={t.remaining} spend={spend} />
      <section aria-labelledby="tiers-h">
        <h2 id="tiers-h" className="mb-4 text-3xl">The tiers</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {tiers.map((tier) => {
            const current = tier.name === t.current.name;
            return (
              <li key={tier.name} className={`p-6 ${current ? "bg-paper text-paper-ink" : "bg-surface"}`} style={{ borderRadius: "var(--radius)" }} aria-current={current ? "true" : undefined}>
                <div className="mb-3 h-2 w-12" style={{ background: tier.color }} aria-hidden />
                <h3 className="text-3xl">{tier.name}</h3>
                <p className="mt-1 text-[16px]">{tier.minSpend === 0 ? "From your first order" : `From ${formatMoney(tier.minSpend)} lifetime spend`}</p>
                <p className="mt-3 text-[16px] font-semibold">{tier.discountPct > 0 ? `${tier.discountPct}% off every order` : "Member prices on launches"}</p>
                {tier.perks.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-[16px]">{tier.perks.map((p) => <li key={p}>{p}</li>)}</ul>}
                {current && <p className="mt-4 text-[15px] font-semibold">Your tier</p>}
              </li>
            );
          })}
        </ol>
      </section>
      <section aria-labelledby="how-h" className="max-w-2xl">
        <h2 id="how-h" className="mb-3 text-3xl">How it works</h2>
        <ul className="list-disc space-y-2 pl-5 text-[16px]">
          <li>Every paid order counts towards your lifetime spend, including Cash on Delivery orders once delivered.</li>
          <li>Cancelled, returned and refunded orders are not counted.</li>
          <li>Your discount is applied automatically at checkout when you are signed in, and can be combined with one discount code.</li>
          <li>Lifetime spend never resets, so once you reach a tier it stays with you.</li>
        </ul>
      </section>
    </div>
  );
}
