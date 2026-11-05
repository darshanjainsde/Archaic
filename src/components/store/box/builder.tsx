"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Img } from "@/components/ui/img";
import { cart, express } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import { resolveLine } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { boxDepth, boxSummary, findSpot, fitsAt, grid, itemByRef, priceBox, repack, type BoxCatalog, type CatalogItem, type Rect } from "@/lib/box/core";
import { CARD_FONTS, type BoxConfig, type BoxPlacement } from "@/lib/box/schema";
import type { Selection } from "@/lib/types";
import { boxThumb, fillerCss, finishCss, itemSvg } from "./art";
import { cardFontVars, CARD_FONT_FAMILY } from "./fonts";
import { Plan, type PlanItem } from "./plan";
import { Unboxing } from "./unboxing";
import type { Scene3D } from "./three-view";

const ThreeView = dynamic(() => import("./three-view"), { ssr: false, loading: () => <div className="bx-three bx-three-wait">Setting the table…</div> });

type Placed = BoxPlacement & { uid: string };
type State = Omit<BoxConfig, "items"> & { items: Placed[] };
const STEPS = ["Size", "Decorate", "Fill", "Card", "Seal & order"] as const;
const uid = () => Math.random().toString(36).slice(2, 10);
const DRAFT = "ac_box_draft_v1";

function initial(cat: BoxCatalog): State {
  const size = cat.sizes.find((s) => s.cols === 4 && s.rows === 4) ?? cat.sizes[0];
  return {
    v: 1, sizeId: size.id, finish: cat.finishes[0].id, ribbon: cat.ribbons[0].id, filler: cat.fillers[0].id, seal: "", sealLetter: "", lidName: "",
    card: { paper: cat.papers[0].id, font: "kalam", to: "", message: "", from: "", voice: false },
    items: [], own: null,
  };
}
const toConfig = (s: State): BoxConfig => ({ ...s, items: s.items.map(({ uid: _u, ...p }) => p) });

export function BoxBuilder({ catalog }: { catalog: BoxCatalog }) {
  const router = useRouter();
  const params = useSearchParams();
  const editKey = params.get("edit");
  const [s, setS] = useState<State>(() => initial(catalog));
  const [step, setStep] = useState(0);
  const [view, setView] = useState<"3d" | "plan">("3d");
  const [mode, setMode] = useState<"box" | "compare">("box");
  const [cam, setCam] = useState<Scene3D["cam"]>("angle");
  const [refs, setRefs] = useState(true);
  const [sealed, setSealed] = useState(false);
  const [cat, setCat] = useState(catalog.categories[0]?.id ?? "");
  const [sheet, setSheet] = useState<{ item: CatalogItem; uid: string | null } | null>(null);
  const [unbox, setUnbox] = useState(false);
  const [glOk, setGlOk] = useState(true);
  const loaded = useRef(false);

  // open a box from the bag (?edit=key), else restore an unsaved draft
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const from = editKey ? cart.get().lines.find((l) => l.key === editKey)?.box : (() => { try { const r = localStorage.getItem(DRAFT); return r ? (JSON.parse(r) as BoxConfig) : null; } catch { return null; } })();
    if (!from) return;
    if (!catalog.sizes.some((x) => x.id === from.sizeId)) return;
    setS({ ...initial(catalog), ...from, card: { ...initial(catalog).card, ...from.card }, items: (from.items ?? []).filter((p) => itemByRef(catalog, p.ref)).map((p) => ({ ...p, uid: uid() })) });
    if (editKey) setStep(4);
  }, [editKey, catalog]);
  useEffect(() => { if (!loaded.current || editKey) return; try { localStorage.setItem(DRAFT, JSON.stringify(toConfig(s))); } catch {} }, [s, editKey]);

  const size = catalog.sizes.find((x) => x.id === s.sizeId) ?? catalog.sizes[0];
  const finish = catalog.finishes.find((x) => x.id === s.finish) ?? catalog.finishes[0];
  const ribbon = catalog.ribbons.find((x) => x.id === s.ribbon) ?? catalog.ribbons[0];
  const filler = catalog.fillers.find((x) => x.id === s.filler) ?? catalog.fillers[0];
  const seal = s.seal ? catalog.seals.find((x) => x.id === s.seal) ?? null : null;
  const paper = catalog.papers.find((x) => x.id === s.card.paper) ?? catalog.papers[0];
  const priced = useMemo(() => priceBox(catalog, toConfig(s)), [catalog, s]);
  // before anything is inside, show what the empty, dressed box costs
  const total = priced.ok ? priced.snapshot.total : size.price + finish.price + ribbon.price + filler.price + (seal?.price ?? 0) + paper.price + (s.card.voice ? catalog.voice.price : 0);

  const rects: (Rect & { uid: string })[] = useMemo(() => [...s.items, ...(s.own ? [{ ...s.own, uid: "own" }] : [])], [s.items, s.own]);
  const used = rects.reduce((a, r) => a + r.w * r.h, 0);
  const free = size.cols * size.rows - used;

  /* ---------- derived views ---------- */
  const planItems: PlanItem[] = s.items.map((p) => {
    const it = itemByRef(catalog, p.ref)!;
    let color = it.color, image = it.image;
    if (it.product) { const r = resolveLine(it.price, it.product.options, p.selections, it.product.personalization, p.personalization); if (r.ok) { color = r.snapshot.find((x) => x.hex)?.hex ?? color; image = r.optionImage ?? image; } }
    return { key: p.uid, x: p.x, y: p.y, w: p.w, h: p.h, name: it.name, image, shape: it.shape, color, label: p.personalization || null, editable: Boolean(it.product && (it.product.options.length || it.product.personalization)) };
  });
  const depth = boxDepth(size.depthCm, s.items.map((p) => ({ heightCm: itemByRef(catalog, p.ref)?.heightCm ?? 0 })));
  const scene: Scene3D = useMemo(() => ({
    mode, cellCm: catalog.cellCm, sizes: catalog.sizes, sizeId: s.sizeId, finish, ribbon, filler, seal, sealLetter: s.sealLetter, lidName: s.lidName, sealed, refs, cam, depthCm: depth, own: s.own ?? null,
    items: planItems.map((p) => ({ key: p.key, shape: p.shape, color: p.color, heightCm: itemByRef(catalog, s.items.find((x) => x.uid === p.key)!.ref)!.heightCm, image: p.image, x: p.x, y: p.y, w: p.w, h: p.h, label: p.label })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [mode, catalog, s, finish, ribbon, filler, seal, sealed, refs, cam, depth]);

  /* ---------- actions ---------- */
  const set = useCallback((patch: Partial<State>) => { setS((x) => ({ ...x, ...patch })); setSealed(false); }, []);
  function chooseSize(id: string) {
    const sz = catalog.sizes.find((x) => x.id === id)!;
    const { placed, left } = repack(sz.cols, sz.rows, rects);
    const items = placed.filter((r) => r.uid !== "own").map((r) => ({ ...s.items.find((i) => i.uid === r.uid)!, x: r.x, y: r.y, w: r.w, h: r.h }));
    const ownR = placed.find((r) => r.uid === "own");
    setS((x) => ({ ...x, sizeId: id, items, own: x.own && ownR ? { ...x.own, x: ownR.x, y: ownR.y, w: ownR.w, h: ownR.h } : null }));
    setSealed(false);
    if (left.length) toast(`Didn’t fit in the ${sz.name.toLowerCase()} box: ${left.map((r) => (r.uid === "own" ? "your gift space" : itemByRef(catalog, s.items.find((i) => i.uid === r.uid)!.ref)?.name)).join(", ")}`);
  }
  function add(item: CatalogItem, sel: Selection[] = [], text: string | null = null) {
    const spot = findSpot(size.cols, size.rows, rects, item.w, item.h);
    if (!spot) { toast(`No free ${item.w} × ${item.h} space left. Pick a bigger box or move things.`); return false; }
    set({ items: [...s.items, { uid: uid(), ref: item.ref, ...spot, selections: sel, personalization: text }] });
    return true;
  }
  function move(key: string, x: number, y: number) {
    const r = rects.find((i) => i.uid === key); if (!r) return false;
    const next = { ...r, x, y };
    if (!fitsAt(grid(size.cols, size.rows, rects.filter((i) => i.uid !== key)), size.cols, size.rows, next)) { toast("That space is taken."); return false; }
    if (key === "own") set({ own: { ...s.own!, x, y } }); else set({ items: s.items.map((i) => (i.uid === key ? { ...i, x, y } : i)) });
    return true;
  }
  function turn(key: string) {
    const r = rects.find((i) => i.uid === key)!;
    const others = rects.filter((i) => i.uid !== key);
    let n: Rect | null = { x: r.x, y: r.y, w: r.h, h: r.w };
    if (!fitsAt(grid(size.cols, size.rows, others), size.cols, size.rows, n)) n = findSpot(size.cols, size.rows, others, r.h, r.w);
    if (!n || n.w !== r.h) { toast("No room to turn it."); return; }
    if (key === "own") set({ own: { ...s.own!, ...n } }); else set({ items: s.items.map((i) => (i.uid === key ? { ...i, ...n } : i)) });
  }
  function remove(key: string) { if (key === "own") set({ own: null }); else set({ items: s.items.filter((i) => i.uid !== key) }); }
  function edit(key: string) { const p = s.items.find((i) => i.uid === key); const it = p && itemByRef(catalog, p.ref); if (p && it) setSheet({ item: it, uid: key }); }
  function reserve(w: number, h: number) {
    const others = s.items;
    const spot = findSpot(size.cols, size.rows, others, w, h);
    if (!spot) { toast(`No free ${w} × ${h} space. Make room first.`); return; }
    set({ own: { ...spot, way: s.own?.way ?? "drop" } });
  }

  function saveToBag(now: boolean) {
    if (!priced.ok) { toast.error(priced.error); return; }
    const snap = priced.snapshot;
    const line = {
      key: editKey ?? `box:${uid()}`, productId: "box", slug: "", name: `Gift box · ${snap.size.name} ${snap.size.rows} × ${snap.size.cols}`,
      image: boxThumb({ cols: size.cols, rows: size.rows, finish: finish.color, filler: filler.color, items: planItems.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h, color: p.color, shape: p.shape })), own: s.own }),
      unitPrice: snap.total, quantity: 1, selections: [], selectionLabels: boxSummary(snap), box: toConfig(s),
    };
    if (now) { express.set(line); router.push("/checkout?buy=1"); return; }
    if (editKey) cart.replace(editKey, line); else cart.add(line, catalog.maxPerOrder);
    try { localStorage.removeItem(DRAFT); } catch {}
    toast.success(editKey ? "Your box is updated" : "Your box is in the bag", { action: { label: "View bag", onClick: () => router.push("/cart") } });
    router.push("/cart");
  }

  /* ---------- render ---------- */
  const activeCat = catalog.categories.find((c) => c.id === cat) ?? catalog.categories[0];
  return (
    <div className={cn("bx", cardFontVars)}>
      <div className="bx-head">
        <div><p className="eyebrow">Build your own box</p><h1 className="text-[38px] md:text-[54px]">{catalog.title}</h1></div>
        <p className="max-w-[46ch] text-[15px] text-muted">{catalog.intro}</p>
      </div>

      <div className="bx-layout">
        <div className="bx-stagecol">
          <section className="bx-stage" aria-label="Your box">
            <div className="bx-stagetop">
              <h2 className="text-[22px]">{mode === "compare" ? "Every size, true to scale" : `${size.name} ${size.rows} × ${size.cols}`}</h2>
              {glOk && (
                <div className="bx-seg" role="group" aria-label="View">
                  <button type="button" aria-pressed={view === "3d"} onClick={() => setView("3d")}>3D</button>
                  <button type="button" aria-pressed={view === "plan"} onClick={() => { setView("plan"); setMode("box"); }}>Plan</button>
                </div>
              )}
              <div className="bx-meter" aria-live="polite">
                <span>{used} of {size.cols * size.rows} spaces filled{free > 0 ? ` · ${free} left` : " · full"}</span>
                <i><b style={{ width: `${Math.round((used / (size.cols * size.rows)) * 100)}%` }} /></i>
              </div>
            </div>
            {view === "3d" && glOk ? (
              <>
                <ThreeView scene={scene} onPickSize={(id) => { chooseSize(id); setMode("box"); toast(`Picked the ${catalog.sizes.find((x) => x.id === id)?.name} box`); }} onReady={(ok) => { if (!ok) { setGlOk(false); setView("plan"); } }} />
                <div className="bx-v3bar">
                  <div className="bx-seg" role="group" aria-label="Camera">
                    {(["angle", "top", "eye"] as const).map((k) => <button key={k} type="button" aria-pressed={cam === k} onClick={() => setCam(k)}>{{ angle: "Angle", top: "Top", eye: "Eye level" }[k]}</button>)}
                  </div>
                  <label className="bx-chk"><input type="checkbox" checked={refs} onChange={(e) => setRefs(e.target.checked)} /> Phone & mug for scale</label>
                  <span className="flex-1" />
                  <button type="button" className="btn btn-ghost bx-sm" onClick={() => setMode(mode === "compare" ? "box" : "compare")}>{mode === "compare" ? "Back to my box" : "Compare all sizes"}</button>
                </div>
                <p className="bx-hint">{mode === "compare" ? "Tap a box to choose that size · drag to turn · pinch or scroll to zoom" : `Drag to turn · pinch or scroll to zoom · true to size: 1 space = ${catalog.cellCm} cm`}</p>
              </>
            ) : (
              <>
                <Plan cols={size.cols} rows={size.rows} finish={finish} filler={filler.color} items={planItems} own={s.own ? { ...s.own, key: "own" } : null} onMove={move} onTurn={turn} onEdit={edit} onRemove={remove} />
                <p className="bx-hint">Drag to move · tap to turn, edit or remove · arrow keys work too</p>
              </>
            )}
          </section>
        </div>

        <section className="bx-panel" aria-label="Build steps">
          <div className="bx-steps" role="tablist">
            {STEPS.map((t, i) => (
              <button key={t} type="button" role="tab" aria-selected={i === step} className={i < step ? "is-done" : undefined} onClick={() => setStep(i)}>
                <span>{i < step ? <Check size={13} aria-hidden /> : i + 1}</span>{t}
              </button>
            ))}
          </div>
          <div className="bx-body">
            {step === 0 && (
              <>
                <div><h3>Pick a size</h3><p className="bx-sub">Each space is {catalog.cellCm} × {catalog.cellCm} cm. A jar candle takes one space; an idol or a sweet tin usually takes four.</p></div>
                <div className="bx-sizes">
                  {catalog.sizes.map((z) => (
                    <button key={z.id} type="button" className="bx-sz" aria-pressed={z.id === s.sizeId} onClick={() => chooseSize(z.id)}>
                      <span className="bx-mini" style={{ aspectRatio: `${z.cols} / ${z.rows}`, gridTemplateColumns: `repeat(${z.cols}, 1fr)` }} aria-hidden>{Array.from({ length: z.cols * z.rows }, (_, i) => <i key={i} />)}</span>
                      <b>{z.rows} × {z.cols}</b>
                      <span>{z.name} · {z.cols * z.rows} spaces<br />{z.cols * catalog.cellCm + 1} × {z.rows * catalog.cellCm + 1} × {z.depthCm} cm</span>
                      <em>{formatMoney(z.price)}</em>
                    </button>
                  ))}
                </div>
                {glOk && <button type="button" className="btn btn-ghost w-full" onClick={() => { setView("3d"); setMode("compare"); }}>See every size side by side in 3D</button>}
              </>
            )}

            {step === 1 && (
              <>
                <div><h3>Dress the box</h3><p className="bx-sub">Made by hand in our workshop. The box changes as you pick.</p></div>
                <DecorGroup label="Box" list={catalog.finishes} value={s.finish} onPick={(id) => set({ finish: id })} swatch={(d) => finishCss(d)} />
                <DecorGroup label="Ribbon" list={catalog.ribbons} value={s.ribbon} onPick={(id) => set({ ribbon: id })} swatch={(d) => d.image ? finishCss({ ...d, pattern: "plain" }) : `linear-gradient(90deg, transparent 42%, ${d.color} 42% 58%, transparent 58%), linear-gradient(transparent 42%, ${d.color} 42% 58%, transparent 58%), #d8c2a0`} />
                <DecorGroup label="Filler" list={catalog.fillers} value={s.filler} onPick={(id) => set({ filler: id })} swatch={(d) => d.image ? finishCss({ ...d, pattern: "plain" }) : fillerCss(d.color)} />
                {catalog.seals.length > 0 && (
                  <DecorGroup label="Wax seal" list={[{ id: "", name: "No seal", price: 0, color: "#e8dcc8", image: null, pattern: "plain" }, ...catalog.seals]} value={s.seal} onPick={(id) => set({ seal: id, sealLetter: id && !s.sealLetter ? (s.card.from || "A").slice(0, 1).toUpperCase() : s.sealLetter })}
                    swatch={(d) => d.id ? (d.image ? finishCss({ ...d, pattern: "plain" }) : `radial-gradient(circle at 50% 50%, ${d.color} 0 34%, transparent 35%), #e8dcc8`) : "repeating-linear-gradient(45deg,#e8dcc8 0 6px,#efe5d3 6px 12px)"} />
                )}
                <div className="bx-row2">
                  {seal && (
                    <div><label className="label" htmlFor="bx-seal">Letter on the seal</label><input id="bx-seal" className="field text-[22px] uppercase" style={{ fontFamily: "var(--font-logo)" }} maxLength={1} value={s.sealLetter} onChange={(e) => set({ sealLetter: e.target.value.toUpperCase() })} /></div>
                  )}
                  <div><label className="label" htmlFor="bx-lid">Name on the lid <span className="font-normal text-muted">(optional)</span></label><input id="bx-lid" className="field" maxLength={24} placeholder="e.g. For Maa" value={s.lidName} onChange={(e) => set({ lidName: e.target.value })} /></div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div><h3>Fill it</h3><p className="bx-sub">{free > 0 ? `${free} of ${size.cols * size.rows} spaces free. The space each item takes is on its photo.` : "The box is full. Remove something or pick a bigger size."}</p></div>
                {catalog.categories.length > 1 && (
                  <div className="bx-chips" role="tablist" aria-label="What to add">
                    {catalog.categories.map((c) => <button key={c.id} type="button" role="tab" aria-selected={c.id === activeCat?.id} className="bx-chip" onClick={() => setCat(c.id)}>{c.name} <small>{c.items.length}</small></button>)}
                  </div>
                )}
                {activeCat ? (
                  <div className="bx-shelf">
                    {activeCat.items.map((it) => {
                      const spot = findSpot(size.cols, size.rows, rects, it.w, it.h);
                      const soldOut = it.product?.stock === 0;
                      const needsChoice = Boolean(it.product && (it.product.options.length || it.product.personalization));
                      return (
                        <article key={it.ref} className="bx-opt">
                          <div className="bx-optart">
                            {it.image ? <Img src={it.image} alt="" fill sizes="200px" className="object-cover" /> : <span className="bx-art" dangerouslySetInnerHTML={{ __html: itemSvg(it.shape, it.color, it.w, it.h) }} />}
                            <span className="bx-fp">{it.w} × {it.h}</span>
                          </div>
                          <div className="bx-optb">
                            <h4>{it.name}</h4>
                            {it.details.length > 0 && <p>{it.details.map((d) => `${d.label} ${d.value}`).join(" · ")}</p>}
                            {it.product?.shortDescription && <p className="line-clamp-2">{it.product.shortDescription}</p>}
                            <div className="bx-optr">
                              <b>{formatMoney(it.price)}</b>
                              <button type="button" className="bx-add" disabled={!spot || soldOut} onClick={() => (needsChoice ? setSheet({ item: it, uid: null }) : add(it) && toast(`${it.name} added`))}>{needsChoice ? "Choose" : <><Plus size={14} aria-hidden /> Add</>}</button>
                            </div>
                            {soldOut ? <span className="bx-why">Out of stock</span> : !spot && <span className="bx-why">Needs a free {it.w} × {it.h} space</span>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : <p className="text-muted">Nothing to add yet.</p>}

                {catalog.own.enabled && (
                  <div className="bx-own">
                    <div><h4>Leave a space for your own gift</h4><p className="bx-sub">A watch, a letter, a saree. Keep spaces free and we pack it in with everything else, padded with your filler.</p></div>
                    <div className="bx-chips">
                      {([[1, 1], [2, 1], [2, 2], [3, 2], [3, 3]] as const).filter(([w, h]) => w * h <= catalog.own.maxCells).map(([w, h]) => (
                        <button key={`${w}${h}`} type="button" className="bx-chip" aria-pressed={Boolean(s.own && s.own.w * s.own.h === w * h && Math.max(s.own.w, s.own.h) === Math.max(w, h))} onClick={() => reserve(w, h)}>{w} × {h}</button>
                      ))}
                      {s.own && <button type="button" className="bx-chip" onClick={() => set({ own: null })}>No space</button>}
                    </div>
                    {s.own && (
                      <fieldset className="bx-radios">
                        <legend className="sr-only">How your gift reaches us</legend>
                        {([["drop", "Drop it at our workshop", "Free · we send the address and hours with your order"], ...(catalog.own.pickupEnabled ? [["pickup", "We pick it up from you", `+ ${formatMoney(catalog.own.pickupFee)} · ${catalog.own.pickupArea}`]] : []), ["courier", "Courier it to us", "Free · we pack it the day it arrives"]] as [string, string, string][]).map(([v, t, d]) => (
                          <label key={v}><input type="radio" name="bx-way" value={v} checked={s.own!.way === v} onChange={() => set({ own: { ...s.own!, way: v as "drop" | "pickup" | "courier" } })} /><span><b>{t}</b><span>{d}</span></span></label>
                        ))}
                      </fieldset>
                    )}
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <div><h3>Write the card</h3><p className="bx-sub">Handmade paper, written in the hand you pick. Hindi works too.</p></div>
                <div className={cn("bx-card", s.card.voice && "has-voice")} style={{ background: paper.image ? `center/cover url("${paper.image}")` : paper.color, fontFamily: CARD_FONT_FAMILY[s.card.font] }}>
                  <div className="text-[24px]">Dear {s.card.to || "…"},</div>
                  <div className="bx-msg">{s.card.message || "Your message appears here."}</div>
                  <div className="text-right text-[22px]">— {s.card.from || "…"}</div>
                  {s.card.voice && <span className="bx-qr" aria-label="A QR code for your voice note is printed here" />}
                </div>
                <DecorGroup label="Paper" list={catalog.papers} value={s.card.paper} onPick={(id) => set({ card: { ...s.card, paper: id } })} swatch={(d) => (d.image ? `center/cover url("${d.image}")` : d.color)} />
                <div className="bx-grp">
                  <div className="bx-gh"><b>Handwriting</b></div>
                  <div className="bx-chips">
                    {CARD_FONTS.map((f) => <button key={f.id} type="button" className="bx-chip" aria-pressed={s.card.font === f.id} style={{ fontFamily: CARD_FONT_FAMILY[f.id], fontSize: 17 }} onClick={() => set({ card: { ...s.card, font: f.id } })}>{f.name}{f.note && <small style={{ fontFamily: "var(--font-body)" }}> · {f.note}</small>}</button>)}
                  </div>
                </div>
                <div className="bx-row2">
                  <div><label className="label" htmlFor="bx-to">To</label><input id="bx-to" className="field" maxLength={40} placeholder="e.g. Maa" value={s.card.to} onChange={(e) => set({ card: { ...s.card, to: e.target.value } })} /></div>
                  <div><label className="label" htmlFor="bx-from">From</label><input id="bx-from" className="field" maxLength={40} placeholder="e.g. Riya" value={s.card.from} onChange={(e) => set({ card: { ...s.card, from: e.target.value } })} /></div>
                </div>
                <div>
                  <label className="label" htmlFor="bx-msg">Message</label>
                  <textarea id="bx-msg" className="field min-h-28" maxLength={catalog.maxMessage} value={s.card.message} onChange={(e) => set({ card: { ...s.card, message: e.target.value } })} aria-describedby="bx-msg-n" />
                  <p id="bx-msg-n" className="hint text-right tabular-nums">{s.card.message.length}/{catalog.maxMessage}</p>
                </div>
                {catalog.voice.enabled && (
                  <label className="bx-toggle"><input type="checkbox" checked={s.card.voice} onChange={(e) => set({ card: { ...s.card, voice: e.target.checked } })} /><span><b>Add a voice note · + {formatMoney(catalog.voice.price)}</b><span>Record it on your order page after you order. A small QR on the card plays it when they scan it.</span></span></label>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <div><h3>Seal it and send it</h3><p className="bx-sub">{free > 0 ? `${free} empty space${free === 1 ? "" : "s"} will be padded with ${filler.name.toLowerCase()}.` : "Every space is filled."}</p></div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className="btn btn-primary flex-1" onClick={() => { setSealed((v) => !v); setView(glOk ? "3d" : "plan"); setMode("box"); }}>{sealed ? "Open the lid again" : "Seal the box"}</button>
                  <button type="button" className="btn btn-ghost flex-1" onClick={() => setUnbox(true)} disabled={!s.items.length && !s.own}>Preview their unboxing</button>
                </div>
                {priced.ok ? (
                  <dl className="bx-lines">
                    {priced.snapshot.lines.map((l, i) => <div key={i}><dt>{l.label}</dt><dd>{l.amount ? formatMoney(l.amount) : "Included"}</dd></div>)}
                  </dl>
                ) : <p className="font-semibold text-sale" role="alert">{priced.error}</p>}
                <div className="bx-note"><b>We send you a photo before we seal it</b><span>On WhatsApp or email after packing, so you can ask for anything to be moved.</span></div>
                <p className="text-[14px] text-muted">Packed in {catalog.packDays} working day{catalog.packDays === 1 ? "" : "s"}{s.own ? " after your gift reaches us" : ""}, then shipped across India.</p>
              </>
            )}
          </div>

          <div className="bx-sum">
            <div className="bx-tot"><span>Total <small>{s.items.length} item{s.items.length === 1 ? "" : "s"} · {size.rows} × {size.cols} box</small></span><span className="tabular-nums">{formatMoney(total)}</span></div>
            {!priced.ok && step === 4 && <p className="text-[14px] text-sale" role="alert">{priced.error}</p>}
            <div className="bx-nav">
              {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
              {step < 4 ? (
                <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>Next: {STEPS[step + 1]}</button>
              ) : (
                <>
                  <button type="button" className="btn btn-ghost" disabled={!priced.ok} onClick={() => saveToBag(true)}>Buy now</button>
                  <button type="button" className="btn btn-primary" disabled={!priced.ok} onClick={() => saveToBag(false)}>{editKey ? "Update box in bag" : "Add to bag"}</button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="bx-mbar">
        <div><b className="tabular-nums">{formatMoney(total)}</b><small>{s.items.length} items · {size.rows} × {size.cols}</small></div>
        {step < 4 ? <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>Next: {STEPS[step + 1]}</button> : <button type="button" className="btn btn-primary" disabled={!priced.ok} onClick={() => saveToBag(false)}>{editKey ? "Update box" : "Add to bag"}</button>}
      </div>

      {sheet && <OptionSheet item={sheet.item} existing={sheet.uid ? s.items.find((i) => i.uid === sheet.uid) ?? null : null} onClose={() => setSheet(null)}
        onSave={(sel, text) => {
          if (sheet.uid) { set({ items: s.items.map((i) => (i.uid === sheet.uid ? { ...i, selections: sel, personalization: text } : i)) }); setSheet(null); toast("Updated"); }
          else if (add(sheet.item, sel, text)) { setSheet(null); toast(`${sheet.item.name} added`); }
        }} />}
      <Unboxing open={unbox} onClose={() => setUnbox(false)} cols={size.cols} rows={size.rows} finish={finish} ribbon={ribbon} filler={filler} seal={seal} sealLetter={s.sealLetter} lidName={s.lidName}
        card={{ to: s.card.to, message: s.card.message, from: s.card.from, font: s.card.font, paper: paper.color }} items={planItems} own={s.own ?? null} />
    </div>
  );
}

function DecorGroup({ label, list, value, onPick, swatch }: { label: string; list: { id: string; name: string; price: number; color: string; image: string | null; pattern: string }[]; value: string; onPick: (id: string) => void; swatch: (d: { id: string; name: string; price: number; color: string; image: string | null; pattern: string }) => string }) {
  const cur = list.find((d) => d.id === value);
  return (
    <div className="bx-grp" role="radiogroup" aria-label={label}>
      <div className="bx-gh"><b>{label}</b><span>{cur?.name}</span></div>
      <div className="bx-tiles">
        {list.map((d) => (
          <button key={d.id || "none"} type="button" role="radio" aria-checked={d.id === value} className="bx-tile" onClick={() => onPick(d.id)}>
            <span className="bx-sw" style={{ background: swatch(d) }} aria-hidden />
            <span className="bx-tt">{d.name}</span>
            <span className="bx-tp">{d.price ? `+ ${formatMoney(d.price)}` : "Included"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Choose a shop product's options (jar, scent…) and the name on its label before it goes in the box. */
function OptionSheet({ item, existing, onClose, onSave }: { item: CatalogItem; existing: (BoxPlacement & { uid: string }) | null; onClose: () => void; onSave: (sel: Selection[], text: string | null) => void }) {
  const p = item.product!;
  const [sel, setSel] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const g of p.options) { const ex = existing?.selections.find((x) => x.groupId === g.id); o[g.id] = ex?.valueId ?? g.values.find((v) => v.available)?.id ?? ""; }
    return o;
  });
  const [text, setText] = useState(existing?.personalization ?? "");
  const selections = Object.entries(sel).filter(([, v]) => v).map(([groupId, valueId]) => ({ groupId, valueId }));
  const r = resolveLine(item.price, p.options, selections, p.personalization, text);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="bx-sheet" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bx-sheetin" role="dialog" aria-modal="true" aria-labelledby="bx-sheet-h">
        <div className="flex items-start justify-between gap-3">
          <div><p className="eyebrow">For this box</p><h3 id="bx-sheet-h" className="text-[26px]">{item.name}</h3></div>
          <button type="button" className="bx-x" onClick={onClose} aria-label="Close"><X size={20} aria-hidden /></button>
        </div>
        {p.options.map((g, gi) => (
          <div key={g.id} className="bx-grp" role="radiogroup" aria-label={g.name}>
            <div className="bx-gh"><b>{g.name}</b><span>{g.values.find((v) => v.id === sel[g.id])?.label}</span></div>
            <div className="bx-scents">
              {g.values.map((v, vi) => (
                <button key={v.id} ref={gi === 0 && vi === 0 ? first : undefined} type="button" role="radio" aria-checked={sel[g.id] === v.id} disabled={!v.available} className="bx-scent" onClick={() => setSel({ ...sel, [g.id]: v.id })}>
                  {v.hex && <i style={{ background: v.hex }} aria-hidden />}
                  <span>{v.label}{v.note && <small>{v.note}</small>}{v.priceDelta !== 0 && <small>{v.priceDelta > 0 ? "+" : "−"} {formatMoney(Math.abs(v.priceDelta))}</small>}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {p.personalization && (
          <div>
            <label className="label" htmlFor="bx-pers">{p.personalization.label}{!p.personalization.required && <span className="font-normal text-muted"> (optional)</span>}{p.personalization.price > 0 && <span className="font-normal text-muted"> · + {formatMoney(p.personalization.price)}</span>}</label>
            <input id="bx-pers" className="field" maxLength={p.personalization.maxLength} value={text} onChange={(e) => setText(e.target.value)} />
            <p className="hint text-right tabular-nums">{text.length}/{p.personalization.maxLength}</p>
          </div>
        )}
        {!r.ok && <p className="text-[14px] font-semibold text-sale" role="alert">{r.error}</p>}
        <div className="flex gap-3">
          <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary flex-[2]" disabled={!r.ok} onClick={() => r.ok && onSave(selections, r.personalization)}>{existing ? "Save" : `Add to box · ${formatMoney(r.ok ? r.unitPrice : item.price)}`}</button>
        </div>
      </div>
    </div>
  );
}

