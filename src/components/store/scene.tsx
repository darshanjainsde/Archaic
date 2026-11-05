"use client";
import { useEffect, useRef } from "react";

/**
 * The page-wide scroll scene (theme.motion === "honeycomb"): one fixed canvas behind all store content drawing a kraft
 * honeycomb wrap that opens as you scroll (flat slits at the top, hexagons by the footer), lit by a small fixed candle.
 * Colours come from the theme's CSS variables, so every preset works. Drawing starts after first paint, stops while the
 * tab is hidden, and under prefers-reduced-motion it paints one static final frame.
 */

const WORDS: [number, string, string][] = [
  [0, "Wrapped", "scroll · the paper opens"],
  [0.12, "A match is struck", "the room starts to warm"],
  [0.35, "The wax softens", "the scent finds the air"],
  [0.6, "Warming up", "the room turns gold"],
  [0.85, "Scented", "smells like a slow evening"],
  [0.98, "Lit all evening", "forty hours of this"],
];

type RGB = [number, number, number];

function readRgb(name: string, fallback: RGB): RGB {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(raw);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
/** Relative luminance 0..1, to tune how loud the glow may be on a light ground. */
const lum = (c: RGB) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

export function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const flameRef = useRef<SVGSVGElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const waxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lattice = document.createElement("canvas");
    const lctx = lattice.getContext("2d")!;

    let bg: RGB, kraft: RGB, warm: RGB, light: boolean;
    const readTheme = () => {
      bg = readRgb("--bg", [241, 232, 217]);
      const sale = readRgb("--sale", [168, 90, 31]);
      const muted = readRgb("--muted", [106, 89, 68]);
      // the lattice is kraft paper: halfway between the theme's warm sale colour and its muted ink
      kraft = [0, 1, 2].map((i) => Math.round((sale[i] + muted[i]) / 2)) as RGB;
      light = lum(bg) > 0.55;
      // candle light is a physical colour; a touch deeper on a pale ground so it reads as warmth, not a stain
      warm = light ? [235, 150, 55] : [255, 176, 70];
    };
    readTheme();

    const motes = Array.from({ length: 36 }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2, s: 0.3 + Math.random() * 0.7, o: Math.random() * 6.28 }));
    const S = { p: reduce ? 1 : 0, t: 0, w: 0, h: 0, d: 1, key: "", raf: 0, running: false, word: "", lastY: -1, talkUntil: 0, talking: false };

    const fit = () => {
      const d = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth, h = window.innerHeight;
      if (S.w !== w || S.h !== h || S.d !== d) {
        S.w = w; S.h = h; S.d = d;
        canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
        lattice.width = canvas.width; lattice.height = canvas.height;
        S.key = "";
      }
    };

    const candlePos = () => {
      const phone = S.w < 1024;
      return { cx: S.w - (phone ? 28 : 31), cy: S.h - (phone ? 120 : 64) };
    };

    /** The lattice only changes with scroll, so it is drawn to an offscreen canvas and reused between frames. */
    const drawLattice = (p: number, scrollY: number) => {
      const { w, h, d } = S;
      const cw = w < 1024 ? 34 : 46;
      const open = 0.18 + p * 0.82;
      const rowH = cw * 0.86 * open;
      const drift = reduce ? 0 : (scrollY * 0.18) % (rowH * 2);
      const key = `${w}x${h}:${p.toFixed(3)}:${drift.toFixed(1)}`;
      if (key === S.key) return;
      S.key = key;
      const { cx, cy } = candlePos();
      const rad = Math.max(w, h) * (0.25 + p * 0.9);
      lctx.setTransform(d, 0, 0, d, 0, 0);
      lctx.clearRect(0, 0, w, h);
      // bucket cells by brightness so the whole lattice is a handful of strokes instead of thousands
      const BUCKETS = 8;
      const strokes: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D());
      const fills: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D());
      const hw = cw * 0.5, hh = rowH * 0.5 * 1.15;
      let row = 0;
      for (let y = -drift - rowH * 2; y < h + rowH * 2; y += rowH, row++) {
        const xo = row % 2 ? cw * 0.5 : 0;
        for (let x = -cw + xo; x < w + cw; x += cw) {
          const glow = Math.max(0, 1 - Math.hypot(x - cx, y - cy) / rad);
          const b = Math.min(BUCKETS - 1, Math.floor(glow * BUCKETS));
          const hex = (path: Path2D) => {
            path.moveTo(x, y - hh); path.lineTo(x + hw, y - hh * 0.5); path.lineTo(x + hw, y + hh * 0.5);
            path.lineTo(x, y + hh); path.lineTo(x - hw, y + hh * 0.5); path.lineTo(x - hw, y - hh * 0.5); path.closePath();
          };
          hex(strokes[b]);
          if (glow * glow * p > 0.06) hex(fills[b]);
        }
      }
      lctx.lineWidth = 1; lctx.lineJoin = "round";
      for (let b = 0; b < BUCKETS; b++) {
        const glow = (b + 0.5) / BUCKETS;
        const fa = glow * glow * (light ? 0.1 : 0.16) * p;
        if (fa > 0.01) { lctx.fillStyle = rgba(warm, fa); lctx.fill(fills[b]); }
        lctx.strokeStyle = rgba(kraft, (light ? 0.2 : 0.16) + glow * 0.25 * p);
        lctx.stroke(strokes[b]);
      }
      // reading veil: keeps the lattice quiet behind the content column
      const veil = lctx.createLinearGradient(0, 0, w, 0);
      veil.addColorStop(0, rgba(bg, 0.18)); veil.addColorStop(0.5, rgba(bg, 0.42)); veil.addColorStop(1, rgba(bg, 0.12));
      lctx.fillStyle = veil; lctx.fillRect(0, 0, w, h);
    };

    const updateWidget = (p: number) => {
      if (barRef.current) barRef.current.style.width = `${Math.round(p * 100)}%`;
      if (flameRef.current) { flameRef.current.style.setProperty("--s", String(0.35 + p * 0.75)); flameRef.current.style.opacity = String(0.55 + p * 0.45); }
      if (haloRef.current) { const s = 10 + p * 90; haloRef.current.style.width = haloRef.current.style.height = `${s}px`; haloRef.current.style.opacity = String(0.2 + p * 0.6); }
      if (waxRef.current) waxRef.current.style.height = `${74 - p * 34}%`;
      let wd = WORDS[0];
      for (const x of WORDS) if (p >= x[0]) wd = x;
      if (S.word !== wd[1]) {
        S.word = wd[1];
        if (wordRef.current) wordRef.current.textContent = wd[1];
        if (noteRef.current) noteRef.current.textContent = wd[2];
      }
    };

    const frame = () => {
      fit();
      const { w, h, d } = S;
      const doc = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const target = reduce ? 1 : Math.min(1, Math.max(0, window.scrollY / doc));
      S.p += (target - S.p) * 0.08;
      if (Math.abs(target - S.p) < 0.0005) S.p = target;
      const p = S.p;
      S.t += 0.01;
      drawLattice(p, window.scrollY);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(lattice, 0, 0);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const { cx, cy } = candlePos();
      const rad = Math.max(w, h) * (0.25 + p * 0.9);
      const k = light ? 0.85 : 1;
      const lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      lg.addColorStop(0, rgba(warm, (0.18 + p * 0.3) * k));
      lg.addColorStop(0.4, rgba(warm, (0.04 + p * 0.12) * k));
      lg.addColorStop(1, rgba(warm, 0));
      ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);
      // a few fragrance motes rising in the warm part
      for (const q of motes) {
        const x = q.x * w + Math.sin(S.t * 0.9 + q.o) * 14;
        const y = ((((q.y - S.t * 0.03 * q.s) % 1) + 1) % 1) * h;
        const a = Math.max(0, Math.min(1, p * 1.3 - (Math.hypot(x - cx, y - cy) / rad) * 0.6)) * 0.7 * k;
        if (a > 0.02) { ctx.fillStyle = rgba(warm, a); ctx.beginPath(); ctx.arc(x, y, q.r, 0, 6.283); ctx.fill(); }
      }
      updateWidget(p);
      // the meter speaks while the page moves, then gets out of the way
      const now = performance.now();
      if (Math.abs(target - p) > 0.002 || window.scrollY !== S.lastY) { if (S.lastY >= 0 || window.scrollY > 0) S.talkUntil = now + 1200; S.lastY = window.scrollY; }
      const talk = !reduce && now < S.talkUntil;
      if (talk !== S.talking && boxRef.current) { S.talking = talk; if (talk) boxRef.current.dataset.talk = ""; else delete boxRef.current.dataset.talk; }
      if (S.running) S.raf = requestAnimationFrame(frame);
    };

    const start = () => { if (S.running || reduce) return; S.running = true; S.raf = requestAnimationFrame(frame); };
    const stop = () => { S.running = false; cancelAnimationFrame(S.raf); };
    const onVis = () => (document.hidden ? stop() : start());
    const onResize = () => { readTheme(); S.key = ""; if (reduce) frame(); };

    // start after first paint so the scene never competes with the page's own content for the first frame
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const kick = () => { canvas.dataset.ready = "1"; if (reduce) frame(); else if (!document.hidden) start(); };
    const idle = ric ? ric(kick, { timeout: 1200 }) : window.setTimeout(kick, 200);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    return () => {
      stop();
      const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
      if (ric && cic) cic(idle); else window.clearTimeout(idle);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="scene-canvas" aria-hidden />
      <div ref={boxRef} className="scene-candle" aria-hidden>
        <div className="scene-meter">
          <b ref={wordRef}>Wrapped</b>
          <i><b ref={barRef} /></i>
          <span ref={noteRef}>scroll · the paper opens</span>
        </div>
        <div className="scene-jar">
          <div ref={haloRef} className="scene-halo" />
          <svg ref={flameRef} className="scene-flame" viewBox="0 0 16 28"><path d="M8 1 c-6 9 3 11 0 17 c-3-6 6-8 0-17z" fill="#ffb347" /><path d="M8 9 c-3 5 1 6 0 9 c-1-3 3-4 0-9z" fill="#fff3c4" /></svg>
          <div className="scene-glass"><div ref={waxRef} className="scene-wax" /></div>
          <div className="scene-wick" />
        </div>
      </div>
    </>
  );
}
