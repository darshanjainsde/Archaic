"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Flame, Wind } from "lucide-react";
import { THEME_PRESETS, DEFAULT_SETTINGS, type StoreSettings, type ThemeSettings, HOME_LAYOUT_VERSION } from "@/lib/settings-schema";
import { FONT_OPTIONS, fontVar } from "@/lib/fonts-list";
import { contrastRatio } from "@/lib/contrast";
import { saveSettingsParts } from "@/actions/admin/settings";
import { cn } from "@/lib/utils";
import { Panel, Toggle, ChoiceCards } from "./ui";
import { ColorField } from "./color-field";
import { ImageField } from "./image-field";
import { LinksEditor, StringListEditor } from "./links-editor";
import { SectionsEditor, type SectionCategory } from "./section-editor";
import type { PickableProduct } from "./product-picker";
import { useConfirm } from "./confirm";
import { SaveBar } from "./save-bar";
import { EditorTabs } from "./editor-tabs";
import { ContactFields, SocialFields, contactProblems, normaliseStore } from "./contact-fields";

export type AppearanceTab = "theme" | "brand" | "header" | "home" | "footer";
type Tab = AppearanceTab;
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

type Props = { initial: StoreSettings; categories: SectionCategory[]; products: PickableProduct[]; initialTab?: Tab };

/** Remounting with a new key throws away unsaved edits ("Discard") and picks up freshly saved settings. */
export function AppearanceEditor(props: Props) {
  const [k, setK] = useState(0);
  return <Editor key={k} {...props} onDiscard={() => setK((x) => x + 1)} />;
}

const TABS: [Tab, string][] = [["theme", "Colours, type & animation"], ["brand", "Brand, contact & social"], ["header", "Header & menu"], ["home", "Homepage"], ["footer", "Footer"]];

function Editor({ initial, categories, products, initialTab, onDiscard }: Props & { onDiscard: () => void }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>(initialTab && TABS.some(([t]) => t === initialTab) ? initialTab : "theme");
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
  const th = (patch: Partial<ThemeSettings>) => { setDirty(true); setTheme((t) => ({ ...t, ...patch })); };
  const st = (patch: Partial<StoreSettings["store"]>) => { setDirty(true); setStore((s) => ({ ...s, ...patch })); };
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
    return r < min ? `Hard to read: ${p[2]} is ${r.toFixed(1)}:1. Aim for ${min}:1 or more.` : null;
  };

  function save() {
    if (!store.name.trim()) { setTab("brand"); toast.error("Give the store a name (Brand, contact & social)"); return; }
    const problems = contactProblems(store);
    if (problems.length) { setTab("brand"); toast.error(`Check ${problems.length === 1 ? "one contact field" : `${problems.length} contact fields`}: ${problems[0]}`); return; }
    const badColor = Object.values(theme.colors).find((c) => !valid(c));
    if (badColor !== undefined) { setTab("theme"); toast.error(`“${badColor}” is not a colour. Use 6-digit hex like #2B2216.`); return; }
    const cleanStore = normaliseStore(store);
    const parts: Partial<StoreSettings> = { theme, store: cleanStore, announcement: { ...announcement, messages: announcement.messages.map((m) => m.trim()).filter(Boolean) }, nav: nav.filter((l) => l.label.trim() && l.href.trim()), home: { version: HOME_LAYOUT_VERSION, sections }, footer: { ...footer, links: footer.links.filter((l) => l.label.trim() && l.href.trim()) } };
    start(async () => {
      const r = await saveSettingsParts(parts);
      if (r.ok) { setStore(cleanStore); setDirty(false); toast.success(r.message ?? "Saved"); router.refresh(); }
      else toast.error(r.error);
    });
  }
  async function reset(area: Tab, what: string) {
    if (!(await confirm({ title: `Reset ${what} to the default?`, body: "Your current choices here are replaced. Nothing changes on the store until you press Save.", confirmLabel: "Reset", danger: true }))) return;
    setDirty(true);
    if (area === "theme") setTheme(structuredClone(DEFAULT_SETTINGS.theme));
    if (area === "header") { setAnnouncement(structuredClone(DEFAULT_SETTINGS.announcement)); setNav(structuredClone(DEFAULT_SETTINGS.nav)); }
    if (area === "home") setSections(structuredClone(DEFAULT_SETTINGS.home.sections));
    if (area === "footer") setFooter(structuredClone(DEFAULT_SETTINGS.footer));
  }
  const resetBtn = (area: Tab, what: string) => <button type="button" className="text-btn -mr-3 -mt-3 text-muted" onClick={() => reset(area, what)}>Reset</button>;

  return (
    <div>
      <EditorTabs tabs={TABS} value={tab} onChange={setTab} extra={<a href="/" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm shrink-0" aria-label="Open store in a new tab"><ExternalLink size={18} aria-hidden /><span className="hidden sm:inline">Open store</span></a>} />

      {tab === "theme" && (
        <div className="grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            <Panel title="Ready-made looks" description="Start from a look, then fine-tune the colours below." actions={resetBtn("theme", "colours, type and animation")}>
              <div className="grid grid-cols-2 gap-3 @xl:grid-cols-3">
                {Object.entries(THEME_PRESETS).map(([k, p]) => (
                  <button key={k} type="button" aria-pressed={theme.preset === k} onClick={() => { setDirty(true); setTheme({ preset: k, motion: theme.motion, ...structuredClone(p.theme) }); }} className={cn("min-h-11 rounded-lg border p-2 text-left", theme.preset === k ? "border-ink ring-2 ring-ink" : "border-black/10 hover:border-black/30")}>
                    <div className="flex h-10 overflow-hidden rounded-md">
                      {[p.theme.colors.bg, p.theme.colors.paper, p.theme.colors.accent, p.theme.colors.field].map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
                    </div>
                    <div className="mt-2 text-[14px] font-semibold">{p.label}</div>
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="Page animation" description="The moving scene behind every store page.">
              <ChoiceCards
                name="motion"
                legend="Choose one"
                value={theme.motion}
                onChange={(v) => th({ motion: v })}
                options={[
                  { value: "honeycomb", label: "Honeycomb + candle", hint: "Kraft honeycomb paper opens as visitors scroll, lit by a small candle.", icon: <Flame size={22} /> },
                  { value: "calm", label: "Calm", hint: "No scroll animation. Pages stay still, best for slower phones.", icon: <Wind size={22} /> },
                ]}
              />
            </Panel>
            <Panel title="Colours" description="Changes show in the preview straight away.">
              <div className="grid gap-4 @md:grid-cols-2">
                {COLOR_LABELS.map(([k, l]) => <ColorField key={k} label={l} value={theme.colors[k]} onChange={(v) => setColor(k, v)} warn={warnFor(k)} />)}
              </div>
            </Panel>
            <Panel title="Type & shape">
              <div className="grid gap-4 @md:grid-cols-2">
                <div>
                  <label className="label" htmlFor="df">Heading font</label>
                  <select id="df" className="field" value={theme.displayFont} onChange={(e) => th({ displayFont: e.target.value as ThemeSettings["displayFont"] })}>
                    {FONT_OPTIONS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="bf">Body font</label>
                  <select id="bf" className="field" value={theme.bodyFont} onChange={(e) => th({ bodyFont: e.target.value as ThemeSettings["bodyFont"] })}>
                    {FONT_OPTIONS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="hw">Heading weight: {theme.headingWeight}</label>
                  <input id="hw" type="range" min={300} max={800} step={100} className="h-11 w-full accent-[var(--accent)]" value={theme.headingWeight} onChange={(e) => th({ headingWeight: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label" htmlFor="rd">Corner roundness: {theme.radius}px</label>
                  <input id="rd" type="range" min={0} max={28} className="h-11 w-full accent-[var(--accent)]" value={theme.radius} onChange={(e) => th({ radius: Number(e.target.value) })} />
                </div>
                <fieldset className="sm:col-span-2">
                  <legend className="label">Button shape</legend>
                  <div className="flex gap-2">
                    {(["square", "pill"] as const).map((b) => <button key={b} type="button" aria-pressed={theme.buttonShape === b} onClick={() => th({ buttonShape: b })} className={cn("btn btn-sm flex-1", theme.buttonShape === b ? "btn-ink" : "btn-ghost")} style={{ borderRadius: b === "pill" ? 999 : 4 }}>{b === "square" ? "Square" : "Pill"}</button>)}
                  </div>
                </fieldset>
              </div>
            </Panel>
          </div>
          <div className="min-w-0 lg:sticky lg:top-32 @4xl:self-start">
            <h2 className="mb-2 text-[15px] font-semibold">Live preview</h2>
            <Preview t={theme} store={store} />
          </div>
        </div>
      )}

      {tab === "brand" && (
        <div className="space-y-6">
          <Panel title="Brand" description="Your name and logo, shown at the top of every page.">
            <div className="grid gap-4 @md:grid-cols-2">
              <div><label className="label" htmlFor="sn">Store name</label><input id="sn" className="field" autoComplete="off" value={store.name} aria-invalid={!store.name.trim()} onChange={(e) => st({ name: e.target.value })} />{!store.name.trim() && <p className="error-text">The store needs a name.</p>}</div>
              <div><label className="label" htmlFor="tg">Tagline</label><input id="tg" className="field" autoComplete="off" placeholder="e.g. Hand-poured candles & gifts" value={store.tagline} onChange={(e) => st({ tagline: e.target.value })} /><p className="hint">A short line used under the name and in search results.</p></div>
              <div className="md:col-span-2"><ImageField label="Logo" value={store.logoUrl} onChange={(v) => st({ logoUrl: v })} aspect="10/3" hint="Transparent PNG or WebP, about 400 × 120 px. Leave empty to show the store name as text." /></div>
            </div>
          </Panel>
          <Panel title="Contact details" description="Shown in the footer, on invoices and on order emails.">
            <ContactFields store={store} set={st} />
          </Panel>
          <Panel title="Social media" description="Each filled link shows as an icon in the store footer. Leave a box empty to hide that icon.">
            <SocialFields store={store} set={st} />
          </Panel>
        </div>
      )}

      {tab === "header" && (
        <div className="space-y-6">
          <Panel title="Announcement bar" description="A thin strip above the header for offers and news." actions={resetBtn("header", "the header and menu")}>
            <Toggle label="Show the announcement bar" checked={announcement.enabled} onChange={(v) => d(setAnnouncement)({ ...announcement, enabled: v })} />
            <div className="mt-4 space-y-4">
              <div>
                <span className="label">Messages</span>
                <StringListEditor items={announcement.messages} onChange={(m) => d(setAnnouncement)({ ...announcement, messages: m })} placeholder="e.g. Free shipping above ₹999" addLabel="Add message" max={6} />
                <p className="hint">With more than one, they take turns.</p>
              </div>
              <div><label className="label" htmlFor="ah">Link (optional)</label><input id="ah" className="field" autoComplete="off" spellCheck={false} value={announcement.href} onChange={(e) => d(setAnnouncement)({ ...announcement, href: e.target.value })} placeholder="e.g. /shop" /><p className="hint">Where a tap on the bar goes.</p></div>
            </div>
          </Panel>
          <Panel title="Menu" description="Shown in the header on computers and in the menu on phones. A link can open a dropdown of categories with pictures.">
            <LinksEditor links={nav} onChange={d(setNav)} max={8} categories={categories} />
          </Panel>
        </div>
      )}

      {tab === "home" && (
        <Panel title="Homepage sections" description="Tick to show a section, use the arrows to change the order, tap a section to edit it." actions={resetBtn("home", "the homepage sections")}>
          <SectionsEditor sections={sections} onChange={d(setSections)} categories={categories} products={products} />
        </Panel>
      )}

      {tab === "footer" && (
        <div className="space-y-6">
          <Panel title="About text" description="A few lines about the shop at the bottom of every page." actions={resetBtn("footer", "the footer")}>
            <label className="sr-only" htmlFor="fa">About text</label>
            <textarea id="fa" rows={5} className="field" value={footer.about} onChange={(e) => d(setFooter)({ ...footer, about: e.target.value })} />
            <p className="hint">Social icons come from Brand, contact & social. Pages with “Show in footer” on are listed automatically.</p>
          </Panel>
          <Panel title="Extra footer links" description="For example Shipping, Returns or Contact.">
            <LinksEditor links={footer.links} onChange={(l) => d(setFooter)({ ...footer, links: l })} />
          </Panel>
        </div>
      )}

      <SaveBar dirty={dirty} pending={pending} onSave={save} onDiscard={onDiscard} />
    </div>
  );
}
