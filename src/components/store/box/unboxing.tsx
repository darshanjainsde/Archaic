"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Img } from "@/components/ui/img";
import type { CatalogDecor } from "@/lib/box/core";
import { fillerCss, finishCss, itemSvg, ownGiftSvg, shade } from "./art";
import { CARD_FONT_FAMILY } from "./fonts";
import type { PlanItem } from "./plan";

/** What the recipient sees: break the seal, lift the lid, read the card, then the box opens. */
export function Unboxing({ open, onClose, cols, rows, finish, ribbon, filler, seal, sealLetter, lidName, card, items, own }: {
  open: boolean; onClose: () => void; cols: number; rows: number;
  finish: CatalogDecor; ribbon: CatalogDecor; filler: CatalogDecor; seal: CatalogDecor | null; sealLetter: string; lidName: string;
  card: { to: string; message: string; from: string; font: string; paper: string };
  items: PlanItem[]; own: { x: number; y: number; w: number; h: number } | null;
}) {
  const [stage, setStage] = useState(0);
  const [typed, setTyped] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) { setStage(seal ? 0 : 1); setTyped(""); setTimeout(() => closeRef.current?.focus(), 30); } }, [open, seal]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [open, onClose]);
  useEffect(() => {
    if (stage !== 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTyped(card.message); return; }
    let i = 0; const t = setInterval(() => { i += 2; setTyped(card.message.slice(0, i)); if (i >= card.message.length) clearInterval(t); }, 28);
    return () => clearInterval(t);
  }, [stage, card.message]);
  if (!open) return null;

  const say = ["A parcel arrives. Your seal is the first thing they touch.", "The wax gives. The twine slips off.", "Your card is on top.", `${items.length} thing${items.length === 1 ? "" : "s"} chosen for them${own ? ", and your own gift" : ""}.`][stage];
  const next = ["Break the seal", "Lift the lid", "Open the box", "Close preview"][stage];
  const cell = 100 / Math.max(cols, rows);
  const dark = (() => { const n = parseInt(finish.color.slice(1), 16); return ((n >> 16) + ((n >> 8) & 255) + (n & 255)) / 3 < 110; })();
  return (
    <div className="bx-unbox" role="dialog" aria-modal="true" aria-label={`What ${card.to || "they"} will see`}>
      <button ref={closeRef} type="button" className="bx-unbox-x" onClick={onClose} aria-label="Close preview"><X size={22} aria-hidden /></button>
      <div className={`bx-ustage s${stage}`}>
        <p className="eyebrow" style={{ color: "#cdb894" }}>What {card.to || "they"} will see</p>
        <div className="bx-ub">
          <div className="bx-uitems" style={{ background: finishCss(finish) }}>
            <div className="bx-ugrid" style={{ background: fillerCss(filler.color), aspectRatio: `${cols} / ${rows}` }}>
              {items.map((it, i) => (
                <span key={it.key} className="bx-uitem" style={{ left: `${(it.x / cols) * 100}%`, top: `${(it.y / rows) * 100}%`, width: `${(it.w / cols) * 100}%`, height: `${(it.h / rows) * 100}%`, transitionDelay: `${0.15 * i}s` }}>
                  {it.image ? <Img src={it.image} alt="" fill sizes={`${cell * it.w}vw`} className="object-cover" /> : <span className="bx-art" dangerouslySetInnerHTML={{ __html: itemSvg(it.shape, it.color, it.w, it.h) }} />}
                </span>
              ))}
              {own && <span className="bx-uitem" style={{ left: `${(own.x / cols) * 100}%`, top: `${(own.y / rows) * 100}%`, width: `${(own.w / cols) * 100}%`, height: `${(own.h / rows) * 100}%` }}><span className="bx-art" dangerouslySetInnerHTML={{ __html: ownGiftSvg(own.w, own.h) }} /></span>}
            </div>
          </div>
          <div className="bx-ucard" style={{ fontFamily: CARD_FONT_FAMILY[card.font] ?? CARD_FONT_FAMILY.kalam, background: card.paper }}>
            <div className="text-[22px]">Dear {card.to || "…"},</div>
            <div className="bx-umsg">{typed}</div>
            <div className="text-right text-[21px]">— {card.from || "…"}</div>
          </div>
          <div className="bx-ulid" style={{ background: finishCss(finish) }}>
            <i style={{ position: "absolute", left: 0, right: 0, top: "calc(50% - 5px)", height: 10, background: ribbon.color }} />
            <i style={{ position: "absolute", top: 0, bottom: 0, left: "calc(50% - 5px)", width: 10, background: ribbon.color }} />
            {seal && <span className="bx-wax" style={{ background: `radial-gradient(circle at 35% 30%, ${shade(seal.color, 40)}, ${seal.color} 70%)` }}>{sealLetter}</span>}
            {lidName && <span className="bx-ulidname" style={{ color: dark ? "#f3e7d0" : "#3d2a14" }}>{lidName}</span>}
          </div>
        </div>
        <p className="bx-usay" aria-live="polite">{say}</p>
        <button type="button" className="btn btn-primary bx-unext" onClick={() => (stage >= 3 ? onClose() : setStage(stage + 1))}>{next}</button>
      </div>
    </div>
  );
}
