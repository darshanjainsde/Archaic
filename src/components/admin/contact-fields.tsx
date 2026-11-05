"use client";
import { useId } from "react";
import type { StoreSettings } from "@/lib/settings-schema";
import { SocialIcon, type SocialKey } from "@/components/ui/social-icons";

type Store = StoreSettings["store"];
type UrlKey = Exclude<SocialKey, "whatsapp">;

/** Where each social link must point, how to fix a bare handle, and the example shown in the box. */
const SOCIAL: { key: UrlKey; label: string; placeholder: string; hosts: RegExp; handle?: (h: string) => string; hint: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/archaiccandles", hosts: /(^|\.)instagram\.com$/, handle: (h) => `https://instagram.com/${h}`, hint: "Your profile link. Typing @yourname also works." },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/archaiccandles", hosts: /(^|\.)(facebook\.com|fb\.com)$/, handle: (h) => `https://facebook.com/${h}`, hint: "Your page link, from facebook.com." },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@archaiccandles", hosts: /(^|\.)(youtube\.com|youtu\.be)$/, handle: (h) => `https://youtube.com/@${h}`, hint: "Your channel link. Typing @channel also works." },
  { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/archaiccandles", hosts: /(^|\.)(pinterest\.[a-z.]+|pin\.it)$/, handle: (h) => `https://pinterest.com/${h}`, hint: "Your profile or board link." },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/archaiccandles", hosts: /(^|\.)(x\.com|twitter\.com)$/, handle: (h) => `https://x.com/${h}`, hint: "Your profile link. Typing @yourname also works." },
  { key: "mapsUrl", label: "Google Maps", placeholder: "https://maps.app.goo.gl/…", hosts: /(^|\.)(google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl|maps\.apple\.com)$/, hint: "In Google Maps, open your shop → Share → Copy link." },
];

/** "@name" or "name" → full profile link; already-full links are left alone. */
export function normaliseSocial(key: UrlKey, raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  const def = SOCIAL.find((s) => s.key === key)!;
  if (/^https?:\/\//i.test(v)) return v.replace(/^http:\/\//i, "https://");
  if (/^[\w.-]+\.[a-z]{2,}\//i.test(v)) return `https://${v}`; // instagram.com/name
  const handle = v.replace(/^@/, "");
  if (def.handle && /^[\w.]{1,60}$/.test(handle)) return def.handle(handle);
  return v;
}

/** Returns a plain-language problem, or null when fine. Empty is fine (the icon is simply not shown). */
export function socialProblem(key: UrlKey, v: string): string | null {
  if (!v.trim()) return null;
  const def = SOCIAL.find((s) => s.key === key)!;
  let u: URL;
  try { u = new URL(v); } catch { return `This is not a link. Paste the full address, e.g. ${def.placeholder}`; }
  if (u.protocol !== "https:") return "The link should start with https://";
  if (!def.hosts.test(u.hostname.replace(/^www\./, ""))) return `This does not look like a ${def.label} link. It should look like ${def.placeholder}`;
  return null;
}

export const whatsappDigits = (v: string) => v.replace(/\D/g, "");
export function whatsappProblem(v: string): string | null {
  if (!v.trim()) return null;
  const d = whatsappDigits(v);
  if (d.length === 10) return "Add the country code in front, e.g. 91 for India: 91" + d;
  if (d.length < 11 || d.length > 15) return "Enter the country code and number, digits only, e.g. 919876543210";
  return null;
}
export function emailProblem(v: string): string | null {
  return v.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "Check the email address, e.g. hello@archaiccandles.com" : null;
}
export function gstinProblem(v: string): string | null {
  return v.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(v.trim()) ? "A GSTIN has 15 characters, e.g. 27ABCDE1234F1Z5" : null;
}

/** Store details with handles turned into links and WhatsApp reduced to digits, ready to save. */
export function normaliseStore(s: Store): Store {
  const n = { ...s, whatsapp: whatsappDigits(s.whatsapp), email: s.email.trim(), gstin: s.gstin.trim() };
  for (const d of SOCIAL) n[d.key] = normaliseSocial(d.key, s[d.key]);
  return n;
}

/** All problems in one list (used to stop a save and point at the field). */
export function contactProblems(s: Store): string[] {
  return [
    emailProblem(s.email), whatsappProblem(s.whatsapp), gstinProblem(s.gstin),
    ...SOCIAL.map((d) => socialProblem(d.key, normaliseSocial(d.key, s[d.key]))),
  ].filter((x): x is string => Boolean(x));
}

function Row({ id, label, icon, hint, problem, children }: { id: string; label: string; icon?: React.ReactNode; hint: string; problem: string | null; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="label flex items-center gap-2" htmlFor={id}>{icon}{label}</label>
      {children}
      {problem ? <p id={`${id}-h`} className="error-text" role="alert">{problem}</p> : <p id={`${id}-h`} className="hint">{hint}</p>}
    </div>
  );
}

export function ContactFields({ store, set }: { store: Store; set: (patch: Partial<Store>) => void }) {
  const id = useId();
  const f = (k: string) => `${id}-${k}`;
  return (
    <div className="grid gap-4 @md:grid-cols-2">
      <Row id={f("em")} label="Email" hint="Shown in the footer and on order emails." problem={emailProblem(store.email)}>
        <input id={f("em")} type="email" inputMode="email" autoComplete="off" spellCheck={false} className="field" placeholder="e.g. hello@archaiccandles.com" value={store.email} aria-invalid={!!emailProblem(store.email)} aria-describedby={`${f("em")}-h`} onChange={(e) => set({ email: e.target.value })} />
      </Row>
      <Row id={f("ph")} label="Phone" hint="Customers can tap it to call you." problem={null}>
        <input id={f("ph")} type="tel" inputMode="tel" autoComplete="off" className="field" placeholder="e.g. +91 98765 43210" value={store.phone} aria-describedby={`${f("ph")}-h`} onChange={(e) => set({ phone: e.target.value })} />
      </Row>
      <Row id={f("wa")} label="WhatsApp number" icon={<SocialIcon name="whatsapp" size={18} />} hint="Country code + number, digits only (91 for India). Adds a WhatsApp chat icon." problem={whatsappProblem(store.whatsapp)}>
        <input id={f("wa")} type="tel" inputMode="numeric" autoComplete="off" className="field" placeholder="e.g. 919876543210" value={store.whatsapp} aria-invalid={!!whatsappProblem(store.whatsapp)} aria-describedby={`${f("wa")}-h`} onChange={(e) => set({ whatsapp: e.target.value })} onBlur={(e) => set({ whatsapp: whatsappDigits(e.target.value) })} />
      </Row>
      <Row id={f("gst")} label="GSTIN" hint="Printed on invoices and in the footer. Leave empty if you don't have one." problem={gstinProblem(store.gstin)}>
        <input id={f("gst")} autoComplete="off" spellCheck={false} className="field uppercase placeholder:normal-case" placeholder="e.g. 27ABCDE1234F1Z5" maxLength={15} value={store.gstin} aria-invalid={!!gstinProblem(store.gstin)} aria-describedby={`${f("gst")}-h`} onChange={(e) => set({ gstin: e.target.value.toUpperCase().replace(/\s/g, "") })} />
      </Row>
      <div className="md:col-span-2">
        <Row id={f("ad")} label="Address" hint="Shown in the footer. Use line breaks as you like." problem={null}>
          <textarea id={f("ad")} rows={3} className="field" placeholder="e.g. 12 Market Road, Pune, Maharashtra 411001" value={store.address} aria-describedby={`${f("ad")}-h`} onChange={(e) => set({ address: e.target.value })} />
        </Row>
      </div>
    </div>
  );
}

export function SocialFields({ store, set }: { store: Store; set: (patch: Partial<Store>) => void }) {
  const id = useId();
  return (
    <div className="grid gap-4 @md:grid-cols-2">
      {SOCIAL.map((d) => {
        const fid = `${id}-${d.key}`;
        const problem = socialProblem(d.key, normaliseSocial(d.key, store[d.key]));
        return (
          <Row key={d.key} id={fid} label={d.label} icon={<SocialIcon name={d.key} size={18} />} hint={d.hint} problem={problem}>
            <input id={fid} type="url" inputMode="url" autoComplete="off" spellCheck={false} className="field" placeholder={`e.g. ${d.placeholder}`} value={store[d.key]} aria-invalid={!!problem} aria-describedby={`${fid}-h`}
              onChange={(e) => set({ [d.key]: e.target.value } as Partial<Store>)}
              onBlur={(e) => set({ [d.key]: normaliseSocial(d.key, e.target.value) } as Partial<Store>)} />
          </Row>
        );
      })}
    </div>
  );
}
