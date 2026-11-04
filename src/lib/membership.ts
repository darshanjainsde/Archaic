import type { MembershipTier, StoreSettings } from "./settings-schema";

export function tierForSpend(tiers: MembershipTier[], spend: number) {
  const sorted = [...tiers].sort((a, b) => a.minSpend - b.minSpend);
  let current = sorted[0];
  for (const t of sorted) if (spend >= t.minSpend) current = t;
  const idx = sorted.indexOf(current);
  const next = sorted[idx + 1] ?? null;
  const progress = next ? Math.min(1, (spend - current.minSpend) / Math.max(1, next.minSpend - current.minSpend)) : 1;
  return { current, next, progress, remaining: next ? Math.max(0, next.minSpend - spend) : 0 };
}

export function memberDiscountPct(s: StoreSettings, spend: number): { pct: number; tier: string | null } {
  if (!s.membership.enabled) return { pct: 0, tier: null };
  const { current } = tierForSpend(s.membership.tiers, spend);
  return { pct: current.discountPct, tier: current.name };
}
