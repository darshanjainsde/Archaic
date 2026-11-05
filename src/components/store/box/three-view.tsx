"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { BoxShape } from "@/lib/box/schema";
import type { CatalogDecor } from "@/lib/box/core";
import { shade } from "./art";

/** True-scale 3D view of the box (1 unit = 1 cm) on a table, with a phone and a mug for scale. */

export type Scene3DItem = { key: string; shape: BoxShape; color: string; heightCm: number; image: string | null; x: number; y: number; w: number; h: number; label: string | null };
export type Scene3D = {
  mode: "box" | "compare";
  cellCm: number;
  sizes: { id: string; name: string; cols: number; rows: number; price: number; depthCm: number }[];
  sizeId: string;
  finish: CatalogDecor; ribbon: CatalogDecor; filler: CatalogDecor; seal: CatalogDecor | null;
  sealLetter: string; lidName: string; sealed: boolean;
  items: Scene3DItem[];
  own: { x: number; y: number; w: number; h: number } | null;
  refs: boolean;
  cam: "angle" | "top" | "eye";
  depthCm: number;
};

type Ctx = {
  rd: THREE.WebGLRenderer; sc: THREE.Scene; cam: THREE.PerspectiveCamera; ctl: OrbitControls;
  root: THREE.Group | null; disposables: { dispose(): void }[]; texCache: Map<string, THREE.Texture>;
  lid: THREE.Object3D | null; lidY: number; drop: number; pick: THREE.Object3D[]; span: number; H: number; cmpW: number;
  lastKey: string; raf: number;
};

const money = (p: number) => `₹${Math.round(p / 100).toLocaleString("en-IN")}`;
const optimised = (u: string) => (/^https?:/.test(u) ? `/_next/image?url=${encodeURIComponent(u)}&w=384&q=70` : u);

function rnd(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}
function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!, w, h); return c;
}
function drawFinish(pattern: string, color: string, g: CanvasRenderingContext2D, w: number, h: number) {
  const r = rnd(pattern.length * 97 + 13);
  if (pattern === "marbled") {
    g.fillStyle = "#eae3d6"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, rad = 20 + r() * 70, gr = g.createRadialGradient(x, y, 0, x, y, rad); const c = i % 3 === 2 ? "#d7c7a8" : i % 2 ? shade(color, -15) : shade(color, 20); gr.addColorStop(0, c + "99"); gr.addColorStop(1, c + "00"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    g.strokeStyle = "rgba(90,110,140,.3)"; g.lineWidth = 2;
    for (let j = 0; j < 10; j++) { g.beginPath(); g.moveTo(0, r() * h); g.bezierCurveTo(w * 0.3, r() * h, w * 0.6, r() * h, w, r() * h); g.stroke(); }
  } else if (pattern === "blockprint") {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let y = 16; y < h; y += 32) for (let x = 16; x < w; x += 32) { g.fillStyle = "#f1e6cf"; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.fillStyle = "#c96b3c"; g.beginPath(); g.arc(x + 16, y + 16, 3.5, 0, 7); g.fill(); }
  } else if (pattern === "foil") {
    g.fillStyle = color; g.fillRect(0, 0, w, h); g.fillStyle = "#d6a740";
    for (let y = 10; y < h; y += 20) for (let x = 10; x < w; x += 20) { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
  } else if (pattern === "wood") {
    let x = 0;
    while (x < w) { const bw = 14 + r() * 26; g.fillStyle = shade(color, Math.round(r() * 20 - 10)); g.fillRect(x, 0, bw, h); g.fillStyle = "rgba(120,80,40,.25)"; g.fillRect(x + bw - 2, 0, 2, h); x += bw; }
  } else {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,.07)" : "rgba(70,40,10,.07)"; g.fillRect(r() * w, 0, 1 + r() * 2, h); }
    for (let s = 0; s < 300; s++) { g.fillStyle = "rgba(60,35,10,.1)"; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  }
}

export default function ThreeView({ scene, onPickSize, onReady }: { scene: Scene3D; onPickSize?: (id: string) => void; onReady?: (ok: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const latest = useRef(scene);
  const pickCb = useRef(onPickSize);
  useEffect(() => { pickCb.current = onPickSize; }, [onPickSize]);
  const prevSealed = useRef(scene.sealed);

  // ---- set up once ----
  useEffect(() => {
    const el = host.current!;
    let rd: THREE.WebGLRenderer;
    try { rd = new THREE.WebGLRenderer({ antialias: true }); } catch { onReady?.(false); return; }
    rd.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    rd.shadowMap.enabled = true; rd.shadowMap.type = THREE.PCFSoftShadowMap;
    rd.toneMapping = THREE.ACESFilmicToneMapping; rd.toneMappingExposure = 0.85;
    el.appendChild(rd.domElement);
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0xece2d1); sc.fog = new THREE.Fog(0xece2d1, 260, 640);
    const cam = new THREE.PerspectiveCamera(32, 4 / 3, 1, 2000);
    const ctl = new OrbitControls(cam, rd.domElement);
    ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.maxPolarAngle = 1.48; ctl.minDistance = 12; ctl.maxDistance = 700; ctl.screenSpacePanning = true;
    sc.add(new THREE.HemisphereLight(0xfff3e2, 0x7a5a3a, 1.5));
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.6); sun.position.set(60, 120, 70); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -170, right: 170, top: 170, bottom: -170, near: 10, far: 420 }); sun.shadow.bias = -0.0005; sun.shadow.radius = 3; sc.add(sun);
    const fill = new THREE.DirectionalLight(0xffe2b8, 1.1); fill.position.set(-80, 40, -40); sc.add(fill);
    const c: Ctx = { rd, sc, cam, ctl, root: null, disposables: [], texCache: new Map(), lid: null, lidY: 0, drop: 0, pick: [], span: 60, H: 9, cmpW: 200, lastKey: "", raf: 0 };
    ctx.current = c;

    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      rd.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      if (latest.current.mode === "compare" && c.root) aim(c, latest.current);
    };
    const ro = new ResizeObserver(fit); ro.observe(el); fit();

    let down: [number, number] | null = null;
    const onDown = (e: PointerEvent) => { down = [e.clientX, e.clientY]; };
    const onUp = (e: PointerEvent) => {
      if (!down || latest.current.mode !== "compare") return;
      if (Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) > 6) return;
      const r = rd.domElement.getBoundingClientRect();
      const m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(m, cam);
      const hit = ray.intersectObjects(c.pick, true)[0];
      let o: THREE.Object3D | null = hit?.object ?? null;
      while (o && !o.userData.sizeId) o = o.parent;
      if (o) pickCb.current?.(o.userData.sizeId as string);
    };
    rd.domElement.addEventListener("pointerdown", onDown);
    rd.domElement.addEventListener("pointerup", onUp);

    const loop = (now: number) => {
      c.raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      if (c.lid && c.drop) { const t = Math.min(1, (now - c.drop) / 900), e = 1 - Math.pow(1 - t, 3); c.lid.position.y = c.lidY + 40 * (1 - e); if (t >= 1) c.drop = 0; }
      ctl.update(); rd.render(sc, cam);
    };
    c.raf = requestAnimationFrame(loop);
    build(c, latest.current);
    if (document.fonts?.ready) document.fonts.ready.then(() => { if (ctx.current) { c.texCache.forEach((t) => t.dispose()); c.texCache.clear(); build(c, latest.current); } });
    onReady?.(true);

    return () => {
      cancelAnimationFrame(c.raf); ro.disconnect();
      rd.domElement.removeEventListener("pointerdown", onDown); rd.domElement.removeEventListener("pointerup", onUp);
      clear(c); c.texCache.forEach((t) => t.dispose()); ctl.dispose(); rd.dispose(); rd.domElement.remove(); ctx.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- rebuild when the box changes ----
  useEffect(() => {
    latest.current = scene;
    const c = ctx.current; if (!c) return;
    if (scene.sealed && !prevSealed.current) c.drop = performance.now();
    prevSealed.current = scene.sealed;
    const id = requestAnimationFrame(() => build(c, scene));
    return () => cancelAnimationFrame(id);
  }, [scene]);

  // ---- camera presets ----
  useEffect(() => { const c = ctx.current; if (c && c.root) aim(c, scene); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [scene.cam]);

  return <div ref={host} className="bx-three" />;
}

/* ================= building ================= */

function aim(c: Ctx, s: Scene3D) {
  const span = c.span, H = c.H;
  let p: [number, number, number];
  if (s.cam === "top") p = [0.01, span * 1.55, 0.01];
  else if (s.cam === "eye") p = [span * 0.1, H * 1.1 + 3, span * 1.1];
  else if (s.mode === "compare") {
    const hf = 2 * Math.atan(Math.tan((c.cam.fov * Math.PI) / 360) * c.cam.aspect);
    const d = ((c.cmpW / 2 + 22) / Math.tan(hf / 2)) * 0.95;
    p = [0, d * 0.62, d * 0.78];
  } else p = [span * 0.5, span * 0.6 + H, span * 0.82];
  c.cam.position.set(...p);
  c.ctl.target.set(0, s.cam === "top" ? 0 : H * 0.32, 0);
  c.ctl.update();
}

function clear(c: Ctx) {
  if (!c.root) return;
  c.sc.remove(c.root);
  c.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
  });
  c.disposables.forEach((d) => d.dispose());
  c.disposables = []; c.root = null; c.lid = null; c.pick = [];
}

function build(c: Ctx, s: Scene3D) {
  clear(c);
  const root = new THREE.Group();
  const T = makeKit(c, s);
  if (s.mode === "compare") {
    const rows = [s.sizes.slice(0, Math.ceil(s.sizes.length / 2)), s.sizes.slice(Math.ceil(s.sizes.length / 2))].filter((r) => r.length);
    const gap = 10;
    let totalW = 0;
    const laid = rows.map((row) => {
      const shells = row.map((sz) => ({ sz, ...T.shell(sz.cols, sz.rows, sz.depthCm, []) }));
      const w = shells.reduce((a, b) => a + b.OW, 0) + gap * (shells.length - 1);
      totalW = Math.max(totalW, w);
      let x = -w / 2;
      const placed = shells.map((sh) => { const cx = x + sh.OW / 2; x += sh.OW + gap; return { ...sh, cx }; });
      return { placed, maxD: Math.max(...shells.map((x) => x.OD)) };
    });
    const zs = [-(laid[0].maxD / 2 + 12), laid[1] ? laid[1].maxD / 2 + 12 : 0];
    laid.forEach((row, ri) => row.placed.forEach((sh) => {
      sh.g.position.set(sh.cx, 0, zs[ri]); sh.g.userData.sizeId = sh.sz.id; root.add(sh.g); c.pick.push(sh.g);
      const cur = sh.sz.id === s.sizeId;
      const lb = T.label(`${sh.sz.rows} × ${sh.sz.cols} · ${Math.round(sh.OW)} × ${Math.round(sh.OD)} cm · ${money(sh.sz.price)}`, 4.2, cur ? { bg: "rgba(168,90,31,.96)", ink: "#fff" } : {});
      lb.position.set(sh.cx, sh.H + 5, zs[ri] + sh.OD / 2); root.add(lb);
    }));
    const depth = laid.reduce((a, r) => a + r.maxD, 0) + 70;
    T.table(root, totalW + 90, depth);
    if (s.refs) { T.phone(root, -totalW / 2 - 14, zs[1] + 4, 0.15); T.mug(root, -totalW / 2 - 14, zs[0]); }
    c.cmpW = totalW + 28; c.span = Math.max(totalW * 1.12, depth * 1.3); c.H = 10;
  } else {
    const sz = s.sizes.find((x) => x.id === s.sizeId) ?? s.sizes[0];
    const sh = T.shell(sz.cols, sz.rows, s.depthCm, s.items, s.own);
    root.add(sh.g);
    const L = T.lid(sh.OW, sh.OD, s.sealed, sh.H);
    if (s.sealed) { c.lidY = sh.H - 0.6; L.g.position.set(0, c.lidY + (c.drop ? 40 : 0), 0); c.lid = L.g; }
    else { L.g.position.set(sh.OW * 0.08, 0, -(sh.OD / 2 + L.LD / 2 + 6)); L.g.rotation.y = 0.08; }
    root.add(L.g);
    const dz = sh.OD / 2 + 4;
    T.dim(root, [-sh.OW / 2, 0.1, dz], [sh.OW / 2, 0.1, dz], `${Math.round(sh.OW * 10) / 10} cm wide`, [0, 1.6, dz + 1.5]);
    T.dim(root, [-sh.OW / 2 - 4, 0, sh.OD / 2], [-sh.OW / 2 - 4, sh.H, sh.OD / 2], `${sh.H} cm deep`, [-sh.OW / 2 - 4, sh.H + 2.4, sh.OD / 2]);
    T.dim(root, [sh.OW / 2 + 4, 0.1, -sh.OD / 2], [sh.OW / 2 + 4, 0.1, sh.OD / 2], `${Math.round(sh.OD * 10) / 10} cm`, [sh.OW / 2 + 4, 1.6, 0]);
    if (s.refs) { T.phone(root, sh.OW / 2 + 13, sh.OD / 2 - 8, -0.22); T.mug(root, -sh.OW / 2 - 13, -sh.OD / 2 - 2); }
    T.table(root, Math.max(140, sh.OW * 2.6 + 60), Math.max(110, sh.OD * 2.4 + L.LD + 40));
    c.span = Math.max(sh.OW, sh.OD) + (s.refs ? 40 : 18); c.H = sh.H;
  }
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && (m.material as THREE.Material).transparent) m.castShadow = false; });
  c.sc.add(root); c.root = root;
  const key = `${s.mode}|${s.sizeId}|${s.refs}`;
  if (c.lastKey !== key) { aim(c, s); c.lastKey = key; }
}

function makeKit(c: Ctx, s: Scene3D) {
  const keep = <T extends { dispose(): void }>(x: T) => { c.disposables.push(x); return x; };
  const cached = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
    let t = c.texCache.get(key);
    if (!t) { t = new THREE.CanvasTexture(canvas(w, h, draw)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = c.rd.capabilities.getMaxAnisotropy(); t.wrapS = t.wrapT = THREE.RepeatWrapping; c.texCache.set(key, t); }
    return t;
  };
  const rep = (t: THREE.Texture, rx: number, ry: number) => { const k = keep(t.clone()); k.needsUpdate = true; k.repeat.set(rx, ry); return k; };
  const photo = (url: string) => {
    let t = c.texCache.get("img:" + url);
    if (!t) { t = new THREE.TextureLoader().load(optimised(url)); t.colorSpace = THREE.SRGBColorSpace; c.texCache.set("img:" + url, t); }
    return t;
  };
  const M = (color: THREE.ColorRepresentation, o: { r?: number; m?: number; op?: number; map?: THREE.Texture | null; side?: THREE.Side } = {}) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.7, metalness: o.m ?? 0, transparent: !!o.op, opacity: o.op ?? 1, map: o.map ?? null, side: o.side ?? THREE.FrontSide });
    if (o.op) mat.depthWrite = false;
    return mat;
  };
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };

  // kraft and wood read too pale under tone mapping; a warm tint keeps them looking like card and pine
  const tint = s.finish.image ? 0xffffff : s.finish.pattern === "kraft" ? 0xe6d2b8 : s.finish.pattern === "wood" ? 0xe2c9a4 : 0xffffff;
  const finishTex = () => s.finish.image ? photo(s.finish.image) : cached(`fin:${s.finish.pattern}:${s.finish.color}`, 256, 256, (g, w, h) => drawFinish(s.finish.pattern, s.finish.color, g, w, h));
  const fillerTex = () => cached(`fil:${s.filler.color}`, 256, 256, (g, w, h) => {
    const r = rnd(7), col = s.filler.color; g.fillStyle = shade(col, 40); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) { g.strokeStyle = r() > 0.5 ? shade(col, -25) : shade(col, 25); g.lineWidth = 2 + r() * 2; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.quadraticCurveTo(x + 10 - r() * 20, y - 12 + r() * 24, x + r() * 26 - 13, y + r() * 26 - 13); g.stroke(); }
  });
  const woodTex = () => cached("wood", 1024, 512, (g, w, h) => {
    const r = rnd(3); g.fillStyle = "#86552f"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 170; i++) { const y = r() * h, a = 0.05 + r() * 0.12; g.strokeStyle = r() > 0.5 ? `rgba(60,32,14,${a})` : `rgba(178,122,72,${a})`; g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x / 90 + i) * 4 + r() * 2); g.stroke(); }
    for (let p = 1; p < 4; p++) { g.fillStyle = "rgba(40,20,8,.35)"; g.fillRect(0, (p * h) / 4, w, 2); }
  });

  const label = (txt: string, hcm: number, o: { bg?: string; ink?: string } = {}) => {
    const f = "600 44px Manrope, system-ui, sans-serif";
    const m = document.createElement("canvas").getContext("2d")!; m.font = f;
    const tw = Math.ceil(m.measureText(txt).width) + 44;
    const t = keep(new THREE.CanvasTexture(canvas(tw, 72, (g, w, h) => { g.fillStyle = o.bg ?? "rgba(255,250,241,.94)"; g.fillRect(0, 0, w, h); g.font = f; g.fillStyle = o.ink ?? "#2b2216"; g.textBaseline = "middle"; g.fillText(txt, 22, 38); })));
    t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
    sp.scale.set((hcm * tw) / 72, hcm, 1); sp.renderOrder = 5; return sp;
  };
  const dim = (g: THREE.Group, a: number[], b: number[], txt: string, at: number[]) => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), new THREE.LineBasicMaterial({ color: 0x2b2216, transparent: true, opacity: 0.7 }));
    g.add(l); const sp = label(txt, 2.4); sp.position.set(at[0], at[1], at[2]); g.add(sp);
  };

  const item = (it: Scene3DItem) => {
    const g = new THREE.Group(), fw = it.w * s.cellCm, fd = it.h * s.cellCm, L = Math.max(fw, fd), Wd = Math.min(fw, fd), H = it.heightCm, col = it.color;
    const k = s.cellCm / 5; // dimensions below assume 5 cm spaces
    switch (it.shape) {
      case "jar": {
        const R = Math.min(Wd / 2 - 0.7, 3.3 * k), hh = Math.max(3, H - 0.2);
        g.add(mesh(new THREE.CylinderGeometry(R, R, hh, 48, 1, true), M(0x8a3f10, { op: 0.6, r: 0.08, side: THREE.DoubleSide }), 0, hh / 2, 0));
        g.add(mesh(new THREE.CylinderGeometry(R, R, 0.4, 48), M(0x6a300c, { op: 0.7, r: 0.1 }), 0, 0.2, 0));
        g.add(mesh(new THREE.CylinderGeometry(R - 0.2, R - 0.2, hh - 1.5, 48), M(col, { r: 0.85 }), 0, (hh - 1.5) / 2 + 0.3, 0));
        g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6), M(0x1a1008), 0, hh - 1.2 + 0.45, 0));
        const lt = keep(new THREE.CanvasTexture(canvas(512, 128, (cx, w, h) => {
          cx.clearRect(0, 0, w, h);
          for (const u of [0.08, 0.58]) { cx.fillStyle = "#f6eee1"; cx.fillRect(u * w, 0, w * 0.34, h); cx.fillStyle = "#2b2216"; cx.font = "500 34px Marcellus, serif"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText((it.label || "archaic").slice(0, 14), u * w + w * 0.17, h * 0.45); }
        })));
        lt.colorSpace = THREE.SRGBColorSpace;
        g.add(mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, Math.min(2.6, hh * 0.4), 48, 1, true), new THREE.MeshStandardMaterial({ map: lt, transparent: true, alphaTest: 0.5, roughness: 0.8, side: THREE.DoubleSide }), 0, hh * 0.42, 0));
        break;
      }
      case "dome": {
        const R = Math.min(Wd / 2 - 0.6, 4.3 * k);
        g.add(mesh(new THREE.CylinderGeometry(R, R + 0.2, 1, 48), M(0x6b4a2b, { r: 0.6 }), 0, 0.5, 0));
        g.add(mesh(new THREE.CylinderGeometry(R * 0.63, R * 0.63, Math.max(2, H * 0.4), 40), M(col, { r: 0.85 }), 0, 1 + Math.max(2, H * 0.4) / 2, 0));
        const gm = M(0xdfeeea, { op: 0.2, r: 0.05, side: THREE.DoubleSide }), cylH = Math.max(2, H - 1 - R * 0.9);
        g.add(mesh(new THREE.CylinderGeometry(R * 0.9, R * 0.9, cylH, 48, 1, true), gm, 0, 1 + cylH / 2, 0));
        g.add(mesh(new THREE.SphereGeometry(R * 0.9, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), gm, 0, 1 + cylH, 0));
        break;
      }
      case "tin": {
        const R = Wd / 2 - 0.6, top = it.image ? M(0xffffff, { map: photo(it.image), r: 0.5 }) : M(shade(col, -20), { m: 0.6, r: 0.3 });
        const side = M(col, { m: 0.6, r: 0.35 });
        g.add(mesh(new THREE.CylinderGeometry(R, R, H, 48), [side, top, side], 0, H / 2, 0));
        break;
      }
      case "figure": {
        const sc = H / 7.4, rad = Math.min(Wd / 2 - 0.6, 3.2) / 3.2;
        const pts = [[0, 0], [3.2, 0], [3.2, 0.8], [2.6, 1], [2.9, 2.6], [2.4, 4.2], [1.6, 4.8], [1.9, 5.6], [1.7, 6.6], [0.9, 7.2], [0, 7.4]].map(([x, y]) => new THREE.Vector2(x * rad, y * sc));
        const light = parseInt(col.slice(1, 3), 16) + parseInt(col.slice(3, 5), 16) + parseInt(col.slice(5, 7), 16) > 600;
        g.add(mesh(new THREE.LatheGeometry(pts, 48), light ? M(col, { r: 0.45 }) : M(col, { m: 0.85, r: 0.32 })));
        break;
      }
      case "flat": {
        const top = it.image ? M(0xffffff, { map: photo(it.image), r: 0.8 }) : M(col, { r: 0.85 }), side = M(shade(col, -20), { r: 0.85 });
        g.add(mesh(new THREE.BoxGeometry(L - 1, Math.max(0.6, H), Wd - 1), [side, side, top, side, side, side], 0, Math.max(0.6, H) / 2, 0));
        break;
      }
      default: {
        const top = it.image ? M(0xffffff, { map: photo(it.image), r: 0.6 }) : M(shade(col, 20), { r: 0.6 }), side = M(col, { r: 0.6 });
        g.add(mesh(new THREE.BoxGeometry(L - 1, H, Wd - 1), [side, side, top, side, side, side], 0, H / 2, 0));
      }
    }
    if (fd > fw) g.rotation.y = Math.PI / 2;
    return g;
  };

  const shell = (cols: number, rows: number, depth: number, items: Scene3DItem[], own: Scene3D["own"] = null) => {
    const g = new THREE.Group(), cs = s.cellCm, W = cols * cs, D = rows * cs, t = 0.5, ft = 0.4, H = depth, OW = W + 2 * t, OD = D + 2 * t;
    const ftex = finishTex();
    const wall = (w: number, h: number) => M(tint, { map: rep(ftex, w / 16, h / 16), r: 0.85 });
    g.add(mesh(new THREE.BoxGeometry(OW, ft, OD), wall(OW, OD), 0, ft / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(OW, H, t), wall(OW, H), 0, H / 2, OD / 2 - t / 2));
    g.add(mesh(new THREE.BoxGeometry(OW, H, t), wall(OW, H), 0, H / 2, -OD / 2 + t / 2));
    g.add(mesh(new THREE.BoxGeometry(t, H, D), wall(D, H), OW / 2 - t / 2, H / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(t, H, D), wall(D, H), -OW / 2 + t / 2, H / 2, 0));
    const fl = mesh(new THREE.PlaneGeometry(W, D), M(0xffffff, { map: rep(fillerTex(), W / 14, D / 14), r: 0.95 }), 0, ft + 0.02, 0);
    fl.rotation.x = -Math.PI / 2; fl.castShadow = false; g.add(fl);
    // owner of each space, so the card insert is cut around items that span several spaces
    const owner: (string | null)[][] = Array.from({ length: rows }, () => Array<string | null>(cols).fill(null));
    const all = [...items.map((i) => ({ ...i })), ...(own ? [{ key: "own", ...own }] : [])];
    for (const it of all) for (let y = it.y; y < it.y + it.h; y++) for (let x = it.x; x < it.x + it.w; x++) if (owner[y] && x < cols) owner[y][x] = it.key;
    const dm = M(0xb48a55, { r: 0.9 }), dh = H * 0.55;
    for (let i = 1; i < cols; i++) for (let y = 0; y < rows; y++) { if (owner[y][i - 1] && owner[y][i - 1] === owner[y][i]) continue; g.add(mesh(new THREE.BoxGeometry(0.15, dh, cs), dm, -W / 2 + i * cs, ft + dh / 2, -D / 2 + (y + 0.5) * cs)); }
    for (let j = 1; j < rows; j++) for (let x = 0; x < cols; x++) { if (owner[j - 1][x] && owner[j - 1][x] === owner[j][x]) continue; g.add(mesh(new THREE.BoxGeometry(cs, dh, 0.15), dm, -W / 2 + (x + 0.5) * cs, ft + dh / 2, -D / 2 + j * cs)); }
    // loose filler curls in empty spaces
    const r = rnd(cols * 31 + rows), per = 14, inst = new THREE.InstancedMesh(new THREE.TorusGeometry(0.55, 0.13, 5, 10, Math.PI), M(s.filler.color, { r: 0.9 }), cols * rows * per);
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    let n = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (owner[y][x]) continue;
      for (let k = 0; k < per; k++) { e.set(r() * 6, r() * 6, r() * 6); q.setFromEuler(e); mx.compose(new THREE.Vector3(-W / 2 + (x + 0.1 + r() * 0.8) * cs, ft + 0.3 + r() * 1.6, -D / 2 + (y + 0.1 + r() * 0.8) * cs), q, one); inst.setMatrixAt(n++, mx); }
    }
    inst.count = n; inst.instanceMatrix.needsUpdate = true; inst.castShadow = true; g.add(inst);
    for (const it of items) { const m = item(it); m.position.set(-W / 2 + (it.x + it.w / 2) * cs, ft, -D / 2 + (it.y + it.h / 2) * cs); g.add(m); }
    if (own) {
      const bx = new THREE.BoxGeometry(own.w * cs - 0.6, 5.5, own.h * cs - 0.6), cx = -W / 2 + (own.x + own.w / 2) * cs, cz = -D / 2 + (own.y + own.h / 2) * cs;
      g.add(mesh(bx, M(0xa85a1f, { op: 0.14 }), cx, ft + 2.75, cz));
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(bx), new THREE.LineDashedMaterial({ color: 0xa85a1f, dashSize: 0.8, gapSize: 0.5 }));
      edges.computeLineDistances(); edges.position.set(cx, ft + 2.75, cz); g.add(edges);
      const sp = label("Your gift", 1.1, { bg: "rgba(168,90,31,.95)", ink: "#fff" }); sp.position.set(cx, ft + 6.4, cz); g.add(sp);
    }
    return { g, OW, OD, H };
  };

  const lid = (OW: number, OD: number, sealed: boolean, H: number) => {
    const g = new THREE.Group(), LW = OW + 0.5, LD = OD + 0.5, LH = 3, ftex = finishTex();
    const side = M(tint, { map: rep(ftex, LW / 16, LH / 16), r: 0.85 });
    const dark = (() => { const n = parseInt(s.finish.color.slice(1), 16); return ((n >> 16) + ((n >> 8) & 255) + (n & 255)) / 3 < 110; })();
    const topTex = keep(new THREE.CanvasTexture(canvas(1024, Math.round((1024 * LD) / LW), (cx, w, h) => {
      const img = ftex.image as HTMLCanvasElement | HTMLImageElement | undefined;
      if (img && (img as HTMLImageElement).complete !== false) { const pat = cx.createPattern(img as CanvasImageSource, "repeat"); if (pat) { cx.save(); cx.scale(((w / LW) * 16) / 256, ((w / LW) * 16) / 256); cx.fillStyle = pat; cx.fillRect(0, 0, (LW * 256) / 16, (LD * 256) / 16); cx.restore(); } }
      else { cx.fillStyle = s.finish.color; cx.fillRect(0, 0, w, h); }
      cx.fillStyle = dark ? "#f3e7d0" : "#3d2a14"; cx.textAlign = "center"; cx.font = `${Math.round(w * 0.07)}px Marcellus, serif`; cx.fillText((s.lidName || "").toUpperCase(), w / 2, h * 0.84);
    })));
    topTex.colorSpace = THREE.SRGBColorSpace;
    g.add(mesh(new THREE.BoxGeometry(LW, LH, LD), [side, side, M(tint, { map: topTex, r: 0.85 }), side, side, side], 0, LH / 2, 0));
    const rm = M(s.ribbon.color, { r: 0.55 });
    g.add(mesh(new THREE.BoxGeometry(LW + 0.1, 0.16, 1.4), rm, 0, LH + 0.08, 0));
    g.add(mesh(new THREE.BoxGeometry(1.4, 0.16, LD + 0.1), rm, 0, LH + 0.08, 0));
    if (sealed) {
      const hh = H + LH - 0.1, y = -H / 2 + LH / 2;
      g.add(mesh(new THREE.BoxGeometry(1.4, hh, 0.16), rm, 0, y, LD / 2 + 0.05)); g.add(mesh(new THREE.BoxGeometry(1.4, hh, 0.16), rm, 0, y, -LD / 2 - 0.05));
      g.add(mesh(new THREE.BoxGeometry(0.16, hh, 1.4), rm, LW / 2 + 0.05, y, 0)); g.add(mesh(new THREE.BoxGeometry(0.16, hh, 1.4), rm, -LW / 2 - 0.05, y, 0));
    }
    if (s.seal) {
      const sc = s.seal.color;
      const lt = keep(new THREE.CanvasTexture(canvas(256, 256, (cx, w, h) => {
        cx.fillStyle = sc; cx.fillRect(0, 0, w, h);
        const gr = cx.createRadialGradient(w * 0.4, h * 0.35, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, shade(sc, 45)); gr.addColorStop(1, sc); cx.fillStyle = gr; cx.beginPath(); cx.arc(w / 2, h / 2, w / 2, 0, 7); cx.fill();
        cx.strokeStyle = "rgba(255,255,255,.18)"; cx.lineWidth = 10; cx.beginPath(); cx.arc(w / 2, h / 2, w * 0.38, 0, 7); cx.stroke();
        cx.fillStyle = "#f6e3d3"; cx.font = "120px Marcellus, serif"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText((s.sealLetter || "").slice(0, 1).toUpperCase(), w / 2, h / 2 + 6);
      })));
      lt.colorSpace = THREE.SRGBColorSpace;
      const wm = M(sc, { r: 0.35 });
      g.add(mesh(new THREE.CylinderGeometry(2.3, 2.45, 0.55, 40), [wm, M(0xffffff, { map: lt, r: 0.35 }), wm], 0, LH + 0.45, 0));
    }
    return { g, LD };
  };

  const table = (g: THREE.Group, W: number, D: number) => { const t = mesh(new THREE.BoxGeometry(W, 4, D), M(0xffffff, { map: rep(woodTex(), W / 120, D / 60), r: 0.55 }), 0, -2, 0); t.castShadow = false; g.add(t); };
  const phone = (g: THREE.Group, x: number, z: number, ry: number) => {
    const scr = keep(new THREE.CanvasTexture(canvas(256, 512, (cx, w, h) => {
      const gr = cx.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#2b2233"); gr.addColorStop(1, "#a85a1f");
      cx.fillStyle = "#0d0b0a"; cx.fillRect(0, 0, w, h); cx.fillStyle = gr; cx.fillRect(10, 10, w - 20, h - 20);
      cx.fillStyle = "rgba(255,255,255,.85)"; cx.font = "600 44px Manrope, sans-serif"; cx.textAlign = "center"; cx.fillText("9:41", w / 2, 110);
    })));
    scr.colorSpace = THREE.SRGBColorSpace;
    const bm = M(0x3a3a3c, { m: 0.6, r: 0.35 }), p = new THREE.Group();
    p.add(mesh(new THREE.BoxGeometry(7.15, 0.78, 14.7), [bm, bm, M(0xffffff, { map: scr, r: 0.15 }), bm, bm, bm], 0, 0.39, 0));
    p.position.set(x, 0, z); p.rotation.y = ry; g.add(p);
    const sp = label("Phone · 14.7 cm", 1.9); sp.position.set(x, 4, z + 9.5); g.add(sp);
  };
  const mug = (g: THREE.Group, x: number, z: number) => {
    const m = new THREE.Group(), mm = M(0xf2ede4, { r: 0.4 });
    m.add(mesh(new THREE.CylinderGeometry(4, 3.7, 9.5, 40, 1, true), M(0xf2ede4, { r: 0.4, side: THREE.DoubleSide }), 0, 4.75, 0));
    m.add(mesh(new THREE.CylinderGeometry(3.7, 3.7, 0.4, 40), mm, 0, 0.2, 0));
    m.add(mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.2, 40), M(0x3b2416, { r: 0.2 }), 0, 7.6, 0));
    const h = mesh(new THREE.TorusGeometry(2.3, 0.45, 10, 24, Math.PI), mm, 4, 4.8, 0); h.rotation.z = -Math.PI / 2; m.add(h);
    m.position.set(x, 0, z); g.add(m);
    const sp = label("Mug · 9.5 cm tall", 1.9); sp.position.set(x, 12.5, z); g.add(sp);
  };
  return { shell, lid, table, phone, mug, label, dim };
}
