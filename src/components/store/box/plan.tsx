"use client";
import { useEffect, useRef, useState } from "react";
import { Img } from "@/components/ui/img";
import { fitsAt, grid, type Rect } from "@/lib/box/core";
import type { BoxShape } from "@/lib/box/schema";
import { fillerCss, finishCss, itemSvg, ownGiftSvg } from "./art";

export type PlanItem = Rect & { key: string; name: string; image: string | null; shape: BoxShape; color: string; label: string | null; editable: boolean };

/**
 * Top-down plan of the box. Drag an item to move it (it snaps to spaces and refuses taken ones),
 * tap or press Enter for Turn / Edit / Remove. Keyboard: arrow keys move the focused item.
 */
export function Plan({ cols, rows, finish, filler, items, own, onMove, onTurn, onEdit, onRemove }: {
  cols: number; rows: number;
  finish: { color: string; pattern: string; image: string | null };
  filler: string;
  items: PlanItem[];
  own: (Rect & { key: string }) | null;
  onMove: (key: string, x: number, y: number) => boolean;
  onTurn: (key: string) => void;
  onEdit: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(56);
  const [menu, setMenu] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ key: string; dx: number; dy: number; ok: boolean } | null>(null);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const fit = () => { const w = el.clientWidth - 28; setCell(Math.max(30, Math.floor(Math.min(w / cols, (rows > cols ? 440 : 520) / rows)))); };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, [cols, rows]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest?.(".bx-pop,.bx-item")) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [menu]);

  const all: (PlanItem | (Rect & { key: string; own: true }))[] = [...items, ...(own ? [{ ...own, own: true as const }] : [])];
  const others = (key: string) => all.filter((i) => i.key !== key);
  const canGo = (key: string, r: Rect) => fitsAt(grid(cols, rows, others(key)), cols, rows, r);

  const start = (e: React.PointerEvent, it: Rect & { key: string }) => {
    if (e.button !== 0) return;
    const el = e.currentTarget as HTMLElement; el.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY; let moved = false;
    const mv = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      if (moved) setDrag({ key: it.key, dx, dy, ok: canGo(it.key, { ...it, x: Math.round(it.x + dx / cell), y: Math.round(it.y + dy / cell) }) });
    };
    const up = (ev: PointerEvent) => {
      el.removeEventListener("pointermove", mv); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
      setDrag(null);
      if (!moved) { setMenu((m) => (m === it.key ? null : it.key)); return; }
      onMove(it.key, Math.round(it.x + (ev.clientX - sx) / cell), Math.round(it.y + (ev.clientY - sy) / cell));
    };
    el.addEventListener("pointermove", mv); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  };
  const key = (e: React.KeyboardEvent, it: Rect & { key: string }) => {
    const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (d[e.key]) { e.preventDefault(); onMove(it.key, it.x + d[e.key][0], it.y + d[e.key][1]); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMenu((m) => (m === it.key ? null : it.key)); }
  };

  const W = cell * cols, H = cell * rows;
  const open = all.find((i) => i.key === menu);
  return (
    <div ref={wrap} className="bx-plan">
      <div className="bx-box" style={{ background: finishCss(finish) }}>
        <div className="bx-grid" style={{ width: W, height: H }}>
          <div className="bx-fill" style={{ background: fillerCss(filler) }} aria-hidden />
          {Array.from({ length: cols * rows }, (_, i) => (
            <span key={i} className="bx-cell" style={{ left: (i % cols) * cell, top: Math.floor(i / cols) * cell, width: cell, height: cell }} aria-hidden />
          ))}
          {all.map((it) => {
            const isOwn = "own" in it;
            const d = drag?.key === it.key ? drag : null;
            const p = it as PlanItem;
            return (
              <div
                key={it.key}
                role="button"
                tabIndex={0}
                aria-label={isOwn ? `Space for your own gift, ${it.w} by ${it.h}. Arrow keys move it.` : `${p.name}${p.label ? `, ${p.label}` : ""}. Arrow keys move it, Enter for options.`}
                aria-expanded={menu === it.key}
                className={`bx-item${d ? " is-drag" : ""}${d && !d.ok ? " is-bad" : ""}`}
                style={{ left: it.x * cell, top: it.y * cell, width: it.w * cell, height: it.h * cell, transform: d ? `translate(${d.dx}px,${d.dy}px)` : undefined }}
                onPointerDown={(e) => start(e, it)}
                onKeyDown={(e) => key(e, it)}
              >
                {isOwn ? (
                  <span className="bx-art" dangerouslySetInnerHTML={{ __html: ownGiftSvg(it.w, it.h) }} />
                ) : p.image ? (
                  <span className="bx-photo"><Img src={p.image} alt="" fill sizes={`${Math.max(it.w, it.h) * cell}px`} className="object-cover" draggable={false} /></span>
                ) : (
                  <span className="bx-art" dangerouslySetInnerHTML={{ __html: itemSvg(p.shape, p.color, it.w, it.h) }} />
                )}
                {(isOwn || p.label) && <span className="bx-tag">{isOwn ? "Your gift" : p.label}</span>}
              </div>
            );
          })}
        </div>
      </div>
      {open && (
        <div className="bx-pop" role="dialog" aria-label="Item options" style={{ left: Math.min(Math.max(8, 14 + open.x * cell), (wrap.current?.clientWidth ?? 300) - 240), top: 14 + (open.y + open.h) * cell + 8 }}>
          <b>{"own" in open ? "Space for your own gift" : (open as PlanItem).name}</b>
          <span className="text-[13px] text-muted">{open.w} × {open.h} space{"own" in open ? "" : (open as PlanItem).label ? ` · “${(open as PlanItem).label}”` : ""}</span>
          <div className="bx-pop-row">
            {open.w !== open.h && <button type="button" onClick={() => { onTurn(open.key); setMenu(null); }}>Turn</button>}
            {"own" in open ? null : (open as PlanItem).editable && <button type="button" onClick={() => { onEdit(open.key); setMenu(null); }}>Edit</button>}
            <button type="button" className="is-danger" onClick={() => { onRemove(open.key); setMenu(null); }}>Remove</button>
            <button type="button" onClick={() => setMenu(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
