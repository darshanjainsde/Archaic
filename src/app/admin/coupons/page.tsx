import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney, paiseToRupeesString } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { toLocalInput } from "@/lib/form-data";
import { PageHeader, Panel, Table, Tag, Empty } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/action-form";
import { saveCoupon, deleteCoupon } from "@/actions/admin/catalog";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Coupons" };

export default async function Coupons({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const c = edit ? coupons.find((x) => x.id === edit) : null;
  const now = new Date();
  const state = (x: (typeof coupons)[number]) => !x.isActive ? <Tag>Off</Tag> : x.expiresAt && x.expiresAt < now ? <Tag tone="red">Expired</Tag> : x.startsAt && x.startsAt > now ? <Tag tone="amber">Scheduled</Tag> : x.usageLimit !== null && x.usedCount >= x.usageLimit ? <Tag tone="red">Used up</Tag> : <Tag tone="green">Live</Tag>;
  return (
    <div>
      <PageHeader title="Coupons" description="Discount codes customers enter at checkout." />
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="order-2 lg:order-1">
          {coupons.length === 0 ? <Empty>No coupons yet.</Empty> : (
            <Table>
              <thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Ends</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {coupons.map((x) => (
                  <tr key={x.id}>
                    <td><b className="tracking-wide">{x.code}</b>{x.description && <div className="text-[12px] text-muted">{x.description}</div>}</td>
                    <td className="whitespace-nowrap">{x.type === "PERCENT" ? `${x.value}%` : formatMoney(x.value)}{x.maxDiscount ? <div className="text-[12px] text-muted">max {formatMoney(x.maxDiscount)}</div> : null}</td>
                    <td className="tabular-nums">{x.minOrder ? formatMoney(x.minOrder) : "—"}</td>
                    <td className="tabular-nums">{x.usedCount}{x.usageLimit !== null ? ` / ${x.usageLimit}` : ""}</td>
                    <td className="whitespace-nowrap">{x.expiresAt ? formatDate(x.expiresAt) : "—"}</td>
                    <td>{state(x)}</td>
                    <td className="whitespace-nowrap text-right text-[13px]">
                      <Link className="rounded px-2 py-1 hover:bg-black/5" href={`/admin/coupons?edit=${x.id}`}>Edit</Link>
                      <ConfirmButton className="rounded px-2 py-1 text-sale hover:bg-red-50" confirmText={`Delete ${x.code}?`} action={deleteCoupon.bind(null, x.id)}>Delete</ConfirmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
        <Panel title={c ? `Edit ${c.code}` : "New coupon"} className="order-1 lg:order-2 lg:self-start" actions={c && <Link href="/admin/coupons" className="text-[13px] underline">New instead</Link>}>
          <ActionForm key={c?.id ?? "new"} action={saveCoupon} className="space-y-4" resetOnSuccess={!c}>
            <input type="hidden" name="id" value={c?.id ?? ""} />
            <div><label className="label" htmlFor="code">Code</label><input id="code" name="code" className="field uppercase" defaultValue={c?.code} placeholder="DIWALI15" required /></div>
            <div><label className="label" htmlFor="cdesc">Description (internal)</label><input id="cdesc" name="description" className="field" defaultValue={c?.description ?? ""} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="type">Type</label><select id="type" name="type" className="field" defaultValue={c?.type ?? "PERCENT"}><option value="PERCENT">Percent %</option><option value="FIXED">Fixed ₹</option></select></div>
              <div><label className="label" htmlFor="value">Value</label><input id="value" name="value" inputMode="decimal" className="field" defaultValue={c ? (c.type === "PERCENT" ? c.value : paiseToRupeesString(c.value)) : ""} placeholder="10" required /></div>
              <div><label className="label" htmlFor="min">Min order (₹)</label><input id="min" name="minOrder" inputMode="decimal" className="field" defaultValue={c ? paiseToRupeesString(c.minOrder) : "0"} /></div>
              <div><label className="label" htmlFor="maxd">Max discount (₹)</label><input id="maxd" name="maxDiscount" inputMode="decimal" className="field" defaultValue={paiseToRupeesString(c?.maxDiscount)} placeholder="percent only" /></div>
              <div><label className="label" htmlFor="ul">Total uses</label><input id="ul" name="usageLimit" inputMode="numeric" className="field" defaultValue={c?.usageLimit ?? ""} placeholder="unlimited" /></div>
              <div><label className="label" htmlFor="pul">Uses per customer</label><input id="pul" name="perUserLimit" inputMode="numeric" className="field" defaultValue={c ? (c.perUserLimit ?? "") : 1} placeholder="unlimited" /></div>
              <div><label className="label" htmlFor="st">Starts</label><input id="st" name="startsAt" type="datetime-local" className="field" defaultValue={toLocalInput(c?.startsAt)} /></div>
              <div><label className="label" htmlFor="en">Ends</label><input id="en" name="expiresAt" type="datetime-local" className="field" defaultValue={toLocalInput(c?.expiresAt)} /></div>
            </div>
            <p className="hint">Dates are India time. Leave empty for no limit.</p>
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} className="h-5 w-5 accent-[var(--accent)]" /> Active</label>
            <SubmitButton className="w-full" pendingText="Saving…">{c ? "Save coupon" : "Create coupon"}</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
