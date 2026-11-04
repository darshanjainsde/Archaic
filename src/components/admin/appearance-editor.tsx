"use client";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { THEME_PRESETS, DEFAULT_SETTINGS, type StoreSettings, type ThemeSettings } from "@/lib/settings-schema";
import { FONT_OPTIONS, fontVar } from "@/lib/fonts-list";
import { contrastRatio } from "@/lib/contrast";
import { saveSettingsParts } from "@/actions/admin/settings";
import { cn } from "@/lib/utils";
import { Panel, Toggle } from "./ui";
import { ColorField } from "./color-field";
import { ImageField } from "./image-field";
import { LinksEditor, StringListEditor } from "./links-editor";
import { SectionsEditor } from "./section-editor";

type Tab = "theme" | "header" | "home" | "footer";
const COLOR_LABELS: [keyof ThemeSettings["colors"], string][] = [
  ["bg", "Page background"], ["surface", "Panels"], ["ink", "Text"], ["muted", "Secondary text"], ["accent", "Accent (buttons)"], ["accentInk", "Text on accent"],
  ["field", "Feature section background"], ["fieldInk", "Text on feature section"], ["paper", "Label / card paper"], ["paperInk", "Text on paper"], ["sale", "Discount & alerts"],
];

function previewVars(t: ThemeSettings): React.CSSProperties {
  const c = t.colors;
  return {
    "--bg": c.bg, "--surface": c.surface, "--ink": c.ink, "--muted": c.muted, "--accent": c.accent, "--accent-ink": c.accentInk, "--field": c.field, "--field-ink": c.fieldInk,
    "--paper": c.paper, "--paper-ink": c.paperInk, "--sale": c.sale, "--radius": `${t.radius}px`, "--btn-radius": t.buttonShape === "pill" ? "999px" : `${Math.min(t.radius, 6)}px`,
    "--font-display": `var(${fontVar(t.displayFont)})`, "--font-body": `var(${fontVar(t.bodyFont)})`, "--heading-weight": String(t.headingWeight),
    fontFamily: `var(${fontVar(t.bodyFont)})`,
  } as React.CSSProperties;
}

function Preview({ t, store }: { t: ThemeSettings; store: StoreSettings["store"] }) {
  const h = { fontFamily: `var(${fontVar(t.displayFont)})`, fontWeight: t.headingWeight, letterSpacing: "-0.025em", lineHeight: 1 } as React.CSSProperties;
  return (
    <div style={previewVars(t)} className="overflow-hidden rounded-lg border border-black/10 bg-bg text-ink" aria-label="Theme preview">
      <div className="flex items-center justify-between px-4 py-3 text-[13px]" style={{ background: t.colors.surface }}>
        <span style={h} className="text-[18px]">{store.name}</span><span className="text-muted">Shop · Gifts · Bag (2)</span>
      </div>
      <div className="p-4">
        <div className="label-panel mx-auto max-w-[300px] p-6 text-center" style={{ borderRadius: 0 }}>
          <div className="text-[11px] tracking-[0.2em] opacity-70">ARCHAIC</div>
          <div style={h} className="mt-2 text-[30px]">Oud & Amber</div>
          <div className="mt-1 text-[13px] italic opacity-80">resin · smoke · honey</div>
        </div>
        <p className="mt-4 text-[15px]">Hand-poured soy wax, labelled like the jars they come from.</p>
        <p className="text-[13px] text-muted">Secondary text looks like this.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="btn btn-primary btn-sm">Add to bag</span>
          <span className="btn btn-ghost btn-sm">Wishlist</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {["Sandalwood Jar", "Pillar Trio"].map((n, i) => (
            <div key={n} className="bg-surface p-2" style={{ borderRadius: `${t.radius}px` }}>
              <div className="aspect-[4/5]" style={{ background: i ? t.colors.field : t.colors.paper, borderRadius: `${Math.max(0, t.radius - 4)}px` }} />
              <div className="mt-2 text-[14px] font-semibold">{n}</div>
              <div className="text-[13px]"><b>₹1,249</b> <s className="opacity-60">₹1,399</s> <span style={{ color: t.colors.sale }} className="font-semibold">11% off</span></div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4" style={{ background: t.colors.field, color: t.colors.fieldInk }}>
        <div style={h} className="text-[22px]">Feature section</div>
        <p className="text-[13px]">Used for alternating bands like membership.</p>
      </div>
    </div>
  );
}

export function AppearanceEditor({ initial, categories }: { initial: StoreSettings; categories: { slug: string; name: string }[] }) {
  const [tab, setTab] = useState<Tab>("theme");
  const [theme, setTheme] = useState(initial.theme);
  const [store, setStore] = useState(initial.store);
  const [announcement, setAnnouncement] = useState(initial.announcement);
  const [nav, setNav] = useState(initial.nav);
  const [sections, setSections] = useState(initial.home.sections);
  const [footer, setFooter] = useState(initial.footer);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const d = <T,>(fn: (v: T) => void) => (v: T) => { setDirty(true); fn(v); };
  const setColor = (k: keyof ThemeSettings["colors"], v: string) => { setDirty(true); setTheme((t) => ({ ...t, preset: "custom", colors: { ...t.colors, [k]: v } })); };

  const valid = (h: string) => /^#[0-9a-fA-F]{6}$/.test(h);
  const ratio = (a: string, b: string) => (valid(a) && valid(b) ? contrastRatio(a, b) : 21);
  const warnFor = (k: keyof ThemeSettings["colors"]): string | null => {
    const c = theme.colors;
    const pairs: Partial<Record<keyof ThemeSettings["colors"], [string, string, string]>> = {
      ink: [c.ink, c.bg, "text on background"], accentInk: [c.accentInk, c.accent, "button text"], paperInk: [c.paperInk, c.paper, "text on paper"], fieldInk: [c.fieldInk, c.field, "text on feature section"], muted: [c.muted, c.bg, "secondary text"],
    };
    const p = pairs[k];
    if (!p) return null;
    const r = ratio(p[0], p[1]);
    const min = k === "muted" ? 3 : 4.5;
    return r < min ? `Low contrast for ${p[2]} (${r.toFixed(1)}:1). Aim for ${min}:1 or more.` : null;
  };

  function save() {
    const parts: Partial<StoreSettings> = { theme, store, announcement: { ...announcement, messages: announcement.messages.map((m) => m.trim()).filter(Boolean) }, nav: nav.filter((l) => l.label.trim() && l.href.trim()), home: { sections }, footer: { ...footer, links: footer.links.filter((l) => l.label.trim() && l.href.trim()) } };
    start(async () => {
      const r = await saveSettingsParts(parts);
      if (r.ok) { setDirty(false); toast.success(r.message ?? "Saved"); }
      else toast.error(r.error);
    });
  }
  function reset(area: Tab) {
    if (!confirm("Reset this area to the default design? You still need to Save.")) return;
    setDirty(true);
    if (area === "theme") setTheme(structuredClone(DEFAULT_SETTINGS.theme));
    if (area === "header") { setAnnouncement(structuredClone(DEFAULT_SETTINGS.announcement)); setNav(structuredClone(DEFAULT_SETTINGS.nav)); }
    if (area === "home") setSections(structuredClone(DEFAULT_SETTINGS.home.sections));
    if (area === "footer") setFooter(structuredClone(DEFAULT_SETTINGS.footer));
  }

  const TABS: [Tab, string][] = [["theme", "Colours & type"], ["header", "Logo, header & announcement"], ["home", "Homepage sections"], ["footer", "Footer"]];

  return (
    <div>
      <div className="sticky top-14 z-30 -mx-4 mb-4 flex flex-wrap items-center gap-2 border-b border-black/10 bg-bg/95 px-4 py-2 md:-mx-6 md:px-6">
        <div className="no-scrollbar flex flex-1 gap-1 overflow-x-auto text-[14px]" role="tablist">
          {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={cn("whitespace-nowrap rounded-md px-3 py-1.5", tab === k ? "bg-ink text-bg" : "hover:bg-black/5")}>{l}</button>)}
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Open store</a>
        <button type="button" onClick={save} disabled={pending || !dirty} className="btn btn-primary btn-sm">{pending ? "Saving…" : dirty ? "Save changes" : "Saved"}</button>
      </div>

      {tab === "theme" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Panel title="Presets" description="Start from a look, then fine-tune." actions={<button type="button" className="text-[13px] underline" onClick={() => reset("theme")}>Reset to default</button>}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {Object.entries(THEME_PRESETS).map(([k, p]) => (
                  <button key={k} type="button" aria-pressed={theme.preset === k} onClick={() => { setDirty(true); setTheme({ preset: k, ...structuredClone(p.theme) }); }} className={cn("rounded-lg border p-2 text-left", theme.preset === k ? "border-ink ring-2 ring-ink" : "border-black/10 hover:border-black/30")}>
                    <div className="flex h-10 overflow-hidden rounded">
                      {[p.theme.colors.bg, p.theme.colors.paper, p.theme.colors.accent, p.theme.colors.field].map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
                    </div>
                    <div className="mt-1.5 text-[13px] font-semibold">{p.label}</div>
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="Colours">
              <div className="grid gap-4 sm:grid-cols-2">
                {COLOR_LABELS.map(([k, l]) => <ColorField key={k} label={l} value={theme.colors[k]} onChange={(v) => setColor(k, v)} warn={warnFor(k)} />)}
              </div>
            </Panel>
            <Panel title="Typography & shape">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="df">Heading font</label>
                  <select id="df" className="field" value={theme.displayFont} onChange={(e) => { setDirty(true); setTheme((t) => ({ ...t, displayFont: e.target.value as ThemeSettings["displayFont"] })); }}>
                    {FONT_OPTIONS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="bf">Body font</label>
                  <select id="bf" className="field" value={theme.bodyFont} onChange={(e) => { setDirty(true); setTheme((t) => ({ ...t, bodyFont: e.target.value as ThemeSettings["bodyFont"] })); }}>
                    {FONT_OPTIONS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="hw">Heading weight: {theme.headingWeight}</label>
                  <input id="hw" type="range" min={300} max={800} step={100} className="w-full accent-[var(--accent)]" value={theme.headingWeight} onChange={(e) => { setDirty(true); setTheme((t) => ({ ...t, headingWeight: Number(e.target.value) })); }} />
                </div>
                <div>
                  <label className="label" htmlFor="rd">Corner radius: {theme.radius}px</label>
                  <input id="rd" type="range" min={0} max={28} className="w-full accent-[var(--accent)]" value={theme.radius} onChange={(e) => { setDirty(true); setTheme((t) => ({ ...t, radius: Number(e.target.value) })); }} />
                </div>
                <div>
                  <span className="label">Buttons</span>
                  <div className="flex gap-2">
                    {(["square", "pill"] as const).map((b) => <button key={b} type="button" aria-pressed={theme.buttonShape === b} onClick={() => { setDirty(true); setTheme((t) => ({ ...t, buttonShape: b })); }} className={cn("btn btn-sm flex-1", theme.buttonShape === b ? "btn-ink" : "btn-ghost")} style={{ borderRadius: b === "pill" ? 999 : 4 }}>{b === "square" ? "Square" : "Pill"}</button>)}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
          <div className="lg:sticky lg:top-32 lg:self-start">
            <h2 className="mb-2 text-[14px] font-semibold">Live preview</h2>
            <Preview t={theme} store={store} />
          </div>
        </div>
      )}

      {tab === "header" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Brand">
            <div className="space-y-4">
              <div><label className="label" htmlFor="sn">Store name</label><input id="sn" className="field" value={store.name} onChange={(e) => d(setStore)({ ...store, name: e.target.value })} /></div>
              <div><label className="label" htmlFor="tg">Tagline</label><input id="tg" className="field" value={store.tagline} onChange={(e) => d(setStore)({ ...store, tagline: e.target.value })} /></div>
              <ImageField label="Logo" value={store.logoUrl} onChange={(v) => d(setStore)({ ...store, logoUrl: v })} hint="Transparent PNG or WebP, about 400 × 120 px. Leave empty to show the store name as text." />
            </div>
          </Panel>
          <Panel title="Announcement bar" actions={<button type="button" className="text-[13px] underline" onClick={() => reset("header")}>Reset header</button>}>
            <Toggle label="Show announcement bar" checked={announcement.enabled} onChange={(v) => d(setAnnouncement)({ ...announcement, enabled: v })} />
            <div className="mt-3 space-y-3">
              <span className="label">Messages (rotate)</span>
              <StringListEditor items={announcement.messages} onChange={(m) => d(setAnnouncement)({ ...announcement, messages: m })} placeholder="Free shipping above ₹999" addLabel="Add message" max={6} />
              <div><label className="label" htmlFor="ah">Link (optional)</label><input id="ah" className="field" value={announcement.href} onChange={(e) => d(setAnnouncement)({ ...announcement, href: e.target.value })} placeholder="/shop" /></div>
            </div>
          </Panel>
          <Panel title="Menu links" description="Shown in the header on desktop and in the menu on phones." className="lg:col-span-2">
            <LinksEditor links={nav} onChange={d(setNav)} max={8} />
          </Panel>
        </div>
      )}

      {tab === "home" && (
        <Panel title="Homepage sections" description="Tick to show, use the arrows to reorder, click a section to edit it." actions={<button type="button" className="text-[13px] underline" onClick={() => reset("home")}>Reset to default</button>}>
          <SectionsEditor sections={sections} onChange={d(setSections)} categories={categories} />
        </Panel>
      )}

      {tab === "footer" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="About text" actions={<button type="button" className="text-[13px] underline" onClick={() => reset("footer")}>Reset footer</button>}>
            <label className="sr-only" htmlFor="fa">About text</label>
            <textarea id="fa" rows={5} className="field" value={footer.about} onChange={(e) => d(setFooter)({ ...footer, about: e.target.value })} />
            <p className="hint">Social links are set in Settings → Store details. Published pages marked “footer” are listed automatically.</p>
          </Panel>
          <Panel title="Extra footer links">
            <LinksEditor links={footer.links} onChange={(l) => d(setFooter)({ ...footer, links: l })} />
          </Panel>
        </div>
      )}
    </div>
  );
}
