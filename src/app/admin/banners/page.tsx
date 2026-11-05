import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { toLocalInput } from "@/lib/form-data";
import { Img } from "@/components/ui/img";
import { PageHeader, Panel, Tag, Empty } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/action-form";
import { ImageField } from "@/components/admin/image-field";
import { saveBanner, deleteBanner, toggleBanner } from "@/actions/admin/catalog";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Banners & ads" };

const PLACEMENTS = [
  { v: "HERO", label: "Homepage hero", hint: "Large slide at the top of the homepage" },
  { v: "PROMO", label: "Promo block", hint: "Full-width ad shown where the “Promo” homepage section is placed" },
  { v: "STRIP", label: "Thin strip", hint: "A slim clickable strip above the footer" },
  { v: "POPUP", label: "Popup", hint: "Shown once per visitor after a few seconds" },
];

export default async function Banners({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const banners = await db.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] });
  const b = edit && edit !== "new" ? banners.find((x) => x.id === edit) : null;
  const showForm = edit === "new" || !!b;
  const now = new Date();
  return (
    <div>
      <PageHeader title="Banners & ads" description="Hero slides, promo blocks and popups. Schedule them for sales and festivals." actions={<Link href="/admin/banners?edit=new" className="btn btn-primary btn-sm">New banner</Link>} />
      {showForm && (
        <Panel title={b ? "Edit banner" : "New banner"} className="mb-6" actions={<Link href="/admin/banners" className="text-btn -mr-3 -mt-3">Close</Link>}>
          <ActionForm key={b?.id ?? "new"} action={saveBanner} className="grid gap-4 @md:grid-cols-2">
            <input type="hidden" name="id" value={b?.id ?? ""} />
            <div><label className="label" htmlFor="pl">Placement</label><select id="pl" name="placement" className="field" defaultValue={b?.placement ?? "HERO"}>{PLACEMENTS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}</select><p className="hint">{PLACEMENTS.map((p) => `${p.label}: ${p.hint}`).join(". ")}.</p></div>
            <div><label className="label" htmlFor="so">Order</label><input id="so" name="sortOrder" type="number" className="field" defaultValue={b?.sortOrder ?? 0} /><p className="hint">Lower numbers show first.</p></div>
            <div className="md:col-span-2"><label className="label" htmlFor="t">Headline</label><input id="t" name="title" className="field" defaultValue={b?.title} required maxLength={140} /></div>
            <div className="md:col-span-2"><label className="label" htmlFor="st">Supporting text</label><textarea id="st" name="subtitle" rows={2} className="field" defaultValue={b?.subtitle ?? ""} maxLength={400} /></div>
            <div><label className="label" htmlFor="cl">Button label</label><input id="cl" name="ctaLabel" className="field" defaultValue={b?.ctaLabel ?? ""} placeholder="Shop now" /></div>
            <div><label className="label" htmlFor="ch">Button link</label><input id="ch" name="ctaHref" className="field" defaultValue={b?.ctaHref ?? ""} placeholder="/shop?category=gift-sets" /></div>
            <ImageField label="Image (desktop)" name="image" value={b?.image} hint="Landscape, at least 1600 px wide" />
            <ImageField label="Image (phone, optional)" name="mobileImage" value={b?.mobileImage} hint="Portrait 4:5 works best" />
            <div><label className="label" htmlFor="bg">Background colour</label><input id="bg" name="bgColor" className="field" defaultValue={b?.bgColor ?? ""} placeholder="#6e2b22 (optional)" /></div>
            <div><label className="label" htmlFor="tc">Text colour</label><input id="tc" name="textColor" className="field" defaultValue={b?.textColor ?? ""} placeholder="#f4ecdd (optional)" /></div>
            <div><label className="label" htmlFor="sa">Show from</label><input id="sa" name="startsAt" type="datetime-local" className="field" defaultValue={toLocalInput(b?.startsAt)} /></div>
            <div><label className="label" htmlFor="ea">Show until</label><input id="ea" name="endsAt" type="datetime-local" className="field" defaultValue={toLocalInput(b?.endsAt)} /></div>
            <label className="flex items-center gap-2 text-[14px] md:col-span-2"><input type="checkbox" name="isActive" defaultChecked={b?.isActive ?? true} className="h-5 w-5 accent-[var(--accent)]" /> Active</label>
            <div className="flex gap-2 md:col-span-2">
              <SubmitButton pendingText="Saving…">Save banner</SubmitButton>
              {b && <ConfirmButton className="btn btn-ghost text-sale" confirmText="Delete this banner?" action={deleteBanner.bind(null, b.id)}>Delete</ConfirmButton>}
            </div>
          </ActionForm>
        </Panel>
      )}
      {banners.length === 0 ? <Empty>No banners yet.</Empty> : (
        <div className="space-y-6">
          {PLACEMENTS.map((p) => {
            const list = banners.filter((x) => x.placement === p.v);
            if (!list.length) return null;
            return (
              <section key={p.v}>
                <h2 className="mb-2 text-[15px] font-semibold">{p.label}</h2>
                <ul className="grid gap-3 @md:grid-cols-2 @3xl:grid-cols-3">
                  {list.map((x) => {
                    const live = x.isActive && (!x.startsAt || x.startsAt <= now) && (!x.endsAt || x.endsAt > now);
                    return (
                      <li key={x.id} className="overflow-hidden rounded-lg border border-black/10 bg-surface">
                        <div className="relative aspect-[16/7]" style={{ background: x.bgColor ?? "var(--field)" }}>
                          {x.image && <Img src={x.image} alt="" fill sizes="400px" className="object-cover" />}
                        </div>
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2"><b className="text-[14px]">{x.title}</b>{live ? <Tag tone="green">Live</Tag> : x.isActive ? <Tag tone="amber">Scheduled</Tag> : <Tag>Off</Tag>}</div>
                          {(x.startsAt || x.endsAt) && <p className="mt-0.5 text-[12px] text-muted">{x.startsAt ? formatDate(x.startsAt) : "now"} → {x.endsAt ? formatDate(x.endsAt) : "no end"}</p>}
                          <div className="mt-2 flex gap-1 text-[13px]">
                            <Link className="text-btn" href={`/admin/banners?edit=${x.id}`}>Edit</Link>
                            <ConfirmButton className="text-btn" action={toggleBanner.bind(null, x.id, !x.isActive)}>{x.isActive ? "Hide" : "Show"}</ConfirmButton>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
