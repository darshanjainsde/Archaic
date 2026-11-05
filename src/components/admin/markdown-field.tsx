"use client";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered } from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { uploadFiles } from "./upload";
import { Progress } from "./image-field";

type Tool = { label: string; icon: React.ReactNode; run: (sel: string) => { text: string; select?: [number, number]; block?: boolean } };

const TOOLS: Tool[] = [
  { label: "Heading", icon: <Heading2 size={20} aria-hidden />, run: (s) => ({ text: `## ${s || "Heading"}`, block: true, select: [3, 3 + (s || "Heading").length] }) },
  { label: "Small heading", icon: <Heading3 size={20} aria-hidden />, run: (s) => ({ text: `### ${s || "Small heading"}`, block: true, select: [4, 4 + (s || "Small heading").length] }) },
  { label: "Bold", icon: <Bold size={20} aria-hidden />, run: (s) => ({ text: `**${s || "bold text"}**`, select: [2, 2 + (s || "bold text").length] }) },
  { label: "Italic", icon: <Italic size={20} aria-hidden />, run: (s) => ({ text: `*${s || "italic text"}*`, select: [1, 1 + (s || "italic text").length] }) },
  { label: "Bullet list", icon: <List size={20} aria-hidden />, run: (s) => ({ text: (s || "List item").split("\n").map((l) => `- ${l.replace(/^[-*]\s+/, "")}`).join("\n"), block: true }) },
  { label: "Numbered list", icon: <ListOrdered size={20} aria-hidden />, run: (s) => ({ text: (s || "First step").split("\n").map((l, i) => `${i + 1}. ${l.replace(/^\d+[.)]\s+/, "")}`).join("\n"), block: true }) },
  { label: "Link", icon: <Link2 size={20} aria-hidden />, run: (s) => ({ text: `[${s || "link text"}](https://)`, select: [(s || "link text").length + 3, (s || "link text").length + 11] }) },
];

/**
 * Controlled markdown editor: toolbar (headings, bold, italic, lists, link, image upload) and a Write / Preview switch.
 * The image button uploads through /api/upload and inserts ![description](url).
 */
export function MarkdownEditor({ value, onChange, label, rows = 14, id: idProp, hint }: { value: string; onChange: (v: string) => void; label: string; rows?: number; id?: string; hint?: string }) {
  const autoId = useId();
  const id = idProp ?? `md-${autoId}`;
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);

  /** Replace the selection with `text`; block snippets get their own paragraph. */
  function insert(make: Tool["run"]) {
    const el = ta.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const sel = value.slice(start, end);
    const r = make(sel);
    let before = value.slice(0, start);
    let after = value.slice(end);
    const text = r.text;
    if (r.block) {
      if (before && !before.endsWith("\n\n")) before = before.replace(/\n?$/, "\n\n");
      if (after && !after.startsWith("\n")) after = "\n\n" + after;
    }
    const next = before + text + after;
    onChange(next);
    const base = before.length;
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const [a, b] = r.select ?? [text.length, text.length];
      el.setSelectionRange(base + a, base + b);
    });
  }

  async function addImage(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    setBusy(0);
    try {
      const [url] = await uploadFiles([f], setBusy);
      const alt = f.name.replace(/\.\w+$/, "").replace(/[-_]+/g, " ").replace(/[[\]]/g, "").trim() || "Photo";
      setPreview(false);
      insert(() => ({ text: `![${alt}](${url})`, block: true, select: [2, 2 + alt.length] }));
      toast.success("Image added. Edit the words in [ ] to describe it.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      if (file.current) file.current.value = "";
    }
  }

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <label className="label !mb-0" htmlFor={id}>{label}</label>
        <div role="tablist" aria-label={`${label} view`} className="inline-flex rounded-lg bg-black/[.06] p-1">
          {(["Write", "Preview"] as const).map((t) => {
            const on = (t === "Preview") === preview;
            return <button key={t} type="button" role="tab" aria-selected={on} onClick={() => setPreview(t === "Preview")} className={cn("min-h-11 rounded-md px-4 text-[15px] font-medium", on ? "bg-surface shadow-sm" : "text-muted")}>{t}</button>;
          })}
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-black/[.18] bg-white focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
        {!preview && (
          <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center border-b border-black/10 bg-bg/60 p-1">
            {TOOLS.map((t) => <button key={t.label} type="button" className="icon-btn" aria-label={t.label} title={t.label} onClick={() => insert(t.run)}>{t.icon}</button>)}
            <span className="mx-1 h-6 w-px shrink-0 bg-black/10" aria-hidden />
            <button type="button" className="text-btn shrink-0" onClick={() => file.current?.click()} disabled={busy !== null}><ImagePlus size={20} aria-hidden />Image</button>
          </div>
        )}
        {busy !== null && <div className="border-b border-black/10 p-3"><Progress pct={busy} label="Uploading image" /></div>}
        {preview ? (
          <div className="prose-store min-h-[240px] p-4 !text-[16px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || "<p>Nothing written yet.</p>" }} />
        ) : (
          <textarea ref={ta} id={id} rows={rows} className="block w-full resize-y bg-transparent p-3 text-[16px] leading-6 outline-none" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={`${id}-hint`} />
        )}
      </div>
      <p id={`${id}-hint`} className="hint">{hint ?? "Use the buttons above, or type: ## Heading, **bold**, *italic*, - list item. Leave an empty line between paragraphs."}</p>
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => addImage(e.target.files)} />
    </div>
  );
}

/** Uncontrolled wrapper for <form action> use: keeps a hidden input in sync. */
export function MarkdownField({ name, defaultValue, label, rows = 14, hint }: { name: string; defaultValue: string; label: string; rows?: number; hint?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <MarkdownEditor id={`md-${name}`} value={value} onChange={setValue} label={label} rows={rows} hint={hint} />
    </>
  );
}
