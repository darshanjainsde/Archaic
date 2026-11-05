"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addWithDefaults, canAddWithDefaults } from "@/lib/quick-add";
import { formatMoney } from "@/lib/money";
import type { OptionGroup, Personalization } from "@/lib/types";

export type HeroProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  options: OptionGroup[];
  personalization: Personalization | null;
  inStock: boolean;
  maxQty: number;
};

const LIT_LINE = "Light it tonight.";

/** "Choose your scent. We pour it." → ["Choose your scent.", "We pour it."]; one sentence → [heading, null]. */
function splitHeading(h: string): [string, string | null] {
  const parts = h.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (parts.length < 2) return [h, null];
  return [parts.slice(0, -1).join(" "), parts[parts.length - 1]];
}

/**
 * The pour hero: headline and actions on the left; a glass jar that fills with wax as you scroll and lights at the end,
 * with the chosen product's card beneath it. On wide, tall screens the hero pins for the pour; everywhere else it sits in
 * normal flow and fills as it scrolls past. Reduced motion shows the jar full and lit.
 */
export function HeroPour({ heading, text, ctaLabel, ctaHref, product, buyNow, pour, eyebrow }: { heading: string; text: string; ctaLabel: string; ctaHref: string; product: HeroProduct; buyNow: boolean; pour: boolean; eyebrow: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const [lit, setLit] = useState(!pour);
  const [first, second] = splitHeading(heading);

  useEffect(() => {
    const canvas = canvasRef.current, box = boxRef.current, hero = heroRef.current, wrap = wrapRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !box || !hero || !wrap || !ctx) return;
    const reduce = !pour || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(document.documentElement);
    const paper = css.getPropertyValue("--paper").trim() || "#efe7d8";
    const paperInk = css.getPropertyValue("--paper-ink").trim() || "#2b2216";
    // glass rim and neck take the theme's ink, so the jar reads on light and dark grounds alike
    const inkHex = /^#([0-9a-f]{6})$/i.exec(css.getPropertyValue("--ink").trim())?.[1] ?? "2b2216";
    const inkN = parseInt(inkHex, 16);
    const ink = (a: number) => `rgba(${(inkN >> 16) & 255},${(inkN >> 8) & 255},${inkN & 255},${a})`;
    const h1 = hero.querySelector("h1");
    const display = (h1 && getComputedStyle(h1).fontFamily) || "Georgia, serif";
    const body = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
    const label = product.name.toUpperCase();

    let prog = reduce ? 1 : 0.1, target = prog, t = 0, isLit = false, litT = reduce ? 1 : 0, raf = 0, running = false;

    const rr = (x: number, y: number, w: number, h: number, r: number[]) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

    function wrapLabel(maxW: number, size: number): string[] {
      ctx!.font = `500 ${size}px ${display}`;
      const words = label.split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const next = cur ? `${cur} ${w}` : w;
        if (ctx!.measureText(next).width <= maxW || !cur) cur = next;
        else { lines.push(cur); cur = w; }
      }
      if (cur) lines.push(cur);
      return lines;
    }

    function progress() {
      if (reduce) return 1;
      const pinned = getComputedStyle(hero!).position === "sticky";
      if (pinned) {
        const range = Math.max(1, wrap!.offsetHeight - hero!.offsetHeight);
        return Math.min(1, Math.max(0, -wrap!.getBoundingClientRect().top / (range * 0.9)));
      }
      const r = box!.getBoundingClientRect();
      // fills while the jar travels from the lower part of the screen to the upper third
      return Math.min(1, Math.max(0, (window.innerHeight * 0.7 - r.top) / (window.innerHeight * 0.55)));
    }

    function draw() {
      const d = Math.min(2, window.devicePixelRatio || 1);
      const W = box!.clientWidth, H = box!.clientHeight;
      if (!W || !H) return;
      if (canvas!.width !== Math.round(W * d) || canvas!.height !== Math.round(H * d)) { canvas!.width = Math.round(W * d); canvas!.height = Math.round(H * d); }
      ctx!.setTransform(d, 0, 0, d, 0, 0);
      ctx!.clearRect(0, 0, W, H);
      t += 0.03;
      const sc = progress();
      target = reduce ? 1 : 0.1 + sc * 0.9;
      prog += (target - prog) * (reduce ? 1 : 0.09);
      const pct = Math.round(prog * 100);
      if (barRef.current) barRef.current.style.width = `${pct}%`;
      if (pctRef.current) pctRef.current.textContent = `${pct}%`;
      const nowLit = prog > 0.965;
      if (nowLit !== isLit) { isLit = nowLit; setLit(nowLit); if (!nowLit) litT = 0; }
      if (isLit) litT = Math.min(1, litT + (reduce ? 1 : 0.04));

      // the jar sits in a 3:4 box centred in whatever room it has
      const bh = Math.min(H, W * (4 / 3)), bw = bh * 0.75;
      const jw = bw * 0.62, jh = bh * 0.66, jx = W / 2, jt = (H - bh) / 2 + bh * 0.2, jb = jt + jh, rad = [14, 14, 30, 30];
      const c = ctx!;
      c.fillStyle = "rgba(0,0,0,.22)"; c.beginPath(); c.ellipse(jx, jb + 8, jw * 0.55, 10, 0, 0, Math.PI * 2); c.fill();
      rr(jx - jw / 2, jt, jw, jh, rad);
      const gg = c.createLinearGradient(jx - jw / 2, 0, jx + jw / 2, 0);
      gg.addColorStop(0, "rgba(120,70,20,.55)"); gg.addColorStop(0.18, "rgba(190,120,40,.28)"); gg.addColorStop(0.5, "rgba(220,150,60,.16)"); gg.addColorStop(0.82, "rgba(190,120,40,.28)"); gg.addColorStop(1, "rgba(120,70,20,.6)");
      c.fillStyle = gg; c.fill();
      const level = jb - jh * 0.94 * prog - jh * 0.03;
      const pouring = target > prog + 0.004 && !reduce;
      if (pouring) {
        c.save(); c.globalAlpha = 0.9;
        const sw = 7 + Math.sin(t * 3) * 2;
        c.strokeStyle = "#e9b060"; c.lineCap = "round"; c.lineWidth = sw; c.beginPath();
        for (let y = -10; y < level + 2; y += 5) { const x = jx + Math.sin(y * 0.04 + t * 2.2) * 2; if (y <= -10) c.moveTo(x, y); else c.lineTo(x, y); }
        c.stroke(); c.strokeStyle = "rgba(255,230,170,.7)"; c.lineWidth = sw * 0.35; c.stroke(); c.restore();
      }
      c.save(); rr(jx - jw / 2 + 3, jt + 3, jw - 6, jh - 6, rad); c.clip();
      const wg = c.createLinearGradient(0, level, 0, jb);
      wg.addColorStop(0, "#f1c47c"); wg.addColorStop(0.25, "#dfa352"); wg.addColorStop(1, "#a66a24");
      c.fillStyle = wg; c.beginPath(); c.moveTo(jx - jw / 2, level);
      for (let x2 = 0; x2 <= jw; x2 += 6) c.lineTo(jx - jw / 2 + x2, level + (reduce ? 0 : Math.sin(x2 * 0.06 + t * 2) * 2 + Math.sin(x2 * 0.13 - t * 3)));
      c.lineTo(jx + jw / 2, jb); c.lineTo(jx - jw / 2, jb); c.closePath(); c.fill();
      c.fillStyle = "rgba(255,240,200,.35)"; c.beginPath(); c.ellipse(jx, level + 1, jw * 0.44, 5, 0, 0, Math.PI * 2); c.fill();
      if (pouring) {
        c.strokeStyle = "rgba(255,235,190,.5)"; c.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) { const ph = (t * 1.5 + k * 0.33) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.ellipse(jx, level + 1, 8 + ph * jw * 0.28, 2 + ph * 7, 0, 0, Math.PI * 2); c.stroke(); }
        c.globalAlpha = 1;
      }
      const sg = c.createLinearGradient(jx - jw / 2, 0, jx + jw / 2, 0);
      sg.addColorStop(0, "rgba(60,30,5,.45)"); sg.addColorStop(0.15, "rgba(60,30,5,0)"); sg.addColorStop(0.85, "rgba(60,30,5,0)"); sg.addColorStop(1, "rgba(60,30,5,.5)");
      c.fillStyle = sg; c.fillRect(jx - jw / 2, level, jw, jb - level);
      c.restore();
      const wickTop = level - jh * 0.09;
      c.strokeStyle = "#2a1a0a"; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo(jx, level + 4); c.lineTo(jx + 1.5, wickTop); c.stroke();
      if (litT > 0) {
        const fh = jh * 0.11 * litT, sway = reduce ? 0 : Math.sin(t * 5) * fh * 0.12;
        c.save();
        const gl = c.createRadialGradient(jx, wickTop - fh * 0.5, 0, jx, wickTop - fh * 0.5, fh * 2.2);
        gl.addColorStop(0, "rgba(255,200,120,.6)"); gl.addColorStop(1, "rgba(255,160,60,0)");
        c.fillStyle = gl; c.fillRect(jx - fh * 3, wickTop - fh * 3, fh * 6, fh * 5);
        const fl = (s: number, col: string, ox: number) => {
          const top = wickTop - fh * s;
          c.beginPath(); c.moveTo(jx - 7 * s, wickTop + 2);
          c.bezierCurveTo(jx - 10 * s, wickTop - fh * 0.45 * s, jx + sway * 0.6 + ox, top + fh * 0.2, jx + sway + ox, top);
          c.bezierCurveTo(jx + sway * 0.6 + ox, top + fh * 0.2, jx + 10 * s, wickTop - fh * 0.45 * s, jx + 7 * s, wickTop + 2);
          c.closePath(); c.fillStyle = col; c.fill();
        };
        fl(1, "rgba(255,140,40,.9)", 0); fl(0.7, "rgba(255,200,100,.95)", sway * 0.2); fl(0.38, "#fff6d6", sway * 0.3);
        c.fillStyle = "rgba(70,90,170,.55)"; c.beginPath(); c.ellipse(jx, wickTop + 1, 5, 7, 0, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      c.save(); rr(jx - jw / 2, jt, jw, jh, rad); c.clip();
      const hl = c.createLinearGradient(jx - jw / 2, 0, jx - jw / 2 + jw * 0.22, 0);
      hl.addColorStop(0, "rgba(255,255,255,0)"); hl.addColorStop(0.45, "rgba(255,255,255,.22)"); hl.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = hl; c.fillRect(jx - jw / 2, jt, jw * 0.22, jh);
      c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(jx + jw * 0.3, jt + jh * 0.08, jw * 0.05, jh * 0.75);
      c.restore();
      c.strokeStyle = ink(0.6); c.lineWidth = 2; rr(jx - jw / 2, jt, jw, jh, rad); c.stroke();
      c.fillStyle = ink(0.12); rr(jx - jw / 2 - 4, jt - 6, jw + 8, 16, [6]); c.fill(); c.strokeStyle = ink(0.55); c.stroke();
      // the label is pressed on as the jar fills; it carries the product's own name
      const la = Math.max(0, Math.min(1, (prog - 0.6) / 0.25));
      if (la > 0) {
        c.save(); c.globalAlpha = la;
        const lx = jx - jw * 0.36, ly = jt + jh * 0.38, lw = jw * 0.72, lh = jh * 0.32;
        c.fillStyle = paper; c.fillRect(lx, ly, lw, lh);
        c.strokeStyle = paperInk; c.globalAlpha = la * 0.45; c.setLineDash([3, 3]); c.strokeRect(lx + 5, ly + 5, lw - 10, lh - 10); c.setLineDash([]); c.globalAlpha = la;
        c.textAlign = "center"; c.fillStyle = paperInk;
        let size = Math.round(lw * 0.11), lines = wrapLabel(lw - 20, size);
        while ((lines.length > 2 || lines.some((l) => c.measureText(l).width > lw - 20)) && size > 8) { size -= 1; lines = wrapLabel(lw - 20, size); }
        lines = lines.slice(0, 2);
        const lineH = size * 1.05, top = ly + lh * 0.42 - ((lines.length - 1) * lineH) / 2;
        c.font = `500 ${size}px ${display}`;
        lines.forEach((l, i) => c.fillText(l, jx, top + i * lineH));
        c.font = `600 ${Math.max(7, Math.round(lw * 0.055))}px ${body}`; c.globalAlpha = la * 0.7;
        c.fillText("HAND POURED · SOY WAX", jx, ly + lh * 0.8);
        c.restore();
      }
    }

    const loop = () => { draw(); if (running) raf = requestAnimationFrame(loop); };
    const start = () => { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    // only animate while the hero is on screen and the tab is visible
    let onScreen = true;
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen && !document.hidden) start(); else stop(); });
    io.observe(wrap);
    const onVis = () => (document.hidden || !onScreen ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const onResize = () => { if (!running) draw(); };
    window.addEventListener("resize", onResize);
    const first = requestAnimationFrame(() => { draw(); start(); });
    return () => { stop(); cancelAnimationFrame(first); io.disconnect(); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("resize", onResize); };
  }, [pour, product.name]);

  return (
    <div ref={wrapRef} className="hero-wrap" data-pour={pour ? "1" : undefined}>
      <section ref={heroRef} className="hero-pour" data-lit={lit ? "" : undefined} aria-label="Featured">
        <div className="hero-glow" aria-hidden />
        <div className="container-x hero-grid">
          <div className="hero-copy">
            {eyebrow && <p className="hero-eyebrow">{eyebrow}</p>}
            <h1 className="hero-title">
              {second ? (
                <>
                  <span className="sr-only">{heading}</span>
                  <span aria-hidden>{first}<br /><i>{lit ? LIT_LINE : second}</i></span>
                </>
              ) : heading}
            </h1>
            {text && <p className="hero-text">{text}</p>}
            {pour && (
              <p className="hero-hint" aria-hidden>
                <span>{lit ? "Lit" : "Scroll to pour"}</span><i><b ref={barRef} /></i><span ref={pctRef} className="tabular-nums">10%</span>
              </p>
            )}
            <div className="hero-ctas">
              {ctaLabel && ctaHref && <Link href={ctaHref} className="btn btn-primary">{ctaLabel}</Link>}
              {ctaHref !== "/shop" && <Link href="/shop" className="btn btn-ghost">Browse everything</Link>}
            </div>
          </div>
          <div className="hero-side">
            <div ref={boxRef} className="hero-jar"><canvas ref={canvasRef} aria-hidden /></div>
            <HeroCard product={product} buyNow={buyNow} />
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroCard({ product: p, buyNow }: { product: HeroProduct; buyNow: boolean }) {
  const router = useRouter();
  const [added, setAdded] = useState(0);
  const [showAdded, setShowAdded] = useState(false);
  useEffect(() => {
    if (!added) return;
    setShowAdded(true);
    const t = setTimeout(() => setShowAdded(false), 2000);
    return () => clearTimeout(t);
  }, [added]);
  const href = `/product/${p.slug}`;
  const direct = p.inStock && canAddWithDefaults(p);
  const compare = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice : null;

  function add(now: boolean) {
    const r = addWithDefaults(p, p.maxQty);
    if (r === "invalid") { router.push(href); return; }
    if (r === "max" && !now) { toast(`You already have the most we can send of this`, { action: { label: "View bag", onClick: () => router.push("/cart") } }); return; }
    if (now) { router.push("/checkout"); return; }
    setAdded((n) => n + 1);
    toast.success(`${p.name} added to your bag`, { action: { label: "View bag", onClick: () => router.push("/cart") } });
  }

  return (
    <div className="hero-card">
      <p className="hero-card-name"><Link href={href} className="hover:underline underline-offset-4">{p.name}</Link></p>
      {p.shortDescription && <p className="hero-card-line">{p.shortDescription}</p>}
      <p className="hero-card-price"><span className="tabular-nums">{formatMoney(p.price)}</span>{compare && <s className="tabular-nums">{formatMoney(compare)}</s>}</p>
      {!p.inStock ? (
        <Link href={href} className="btn hero-card-bag">Sold out · see details</Link>
      ) : direct ? (
        <div className={buyNow ? "hero-card-row" : "grid"}>
          {buyNow && <button type="button" className="btn hero-card-now" onClick={() => add(true)}>Buy now</button>}
          <button type="button" className="btn hero-card-bag" onClick={() => add(false)}>
            {showAdded ? <span key={added} className="is-added">✓ Added</span> : "Add to bag"}
          </button>
        </div>
      ) : (
        <Link href={href} className="btn hero-card-now">Choose options</Link>
      )}
    </div>
  );
}
