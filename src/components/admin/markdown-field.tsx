"use client";
import { useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

export function MarkdownField({ name, defaultValue, label, rows = 14 }: { name: string; defaultValue: string; label: string; rows?: number }) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="label !mb-0" htmlFor={`md-${name}`}>{label}</label>
        <button type="button" className="text-[13px] underline" onClick={() => setPreview((p) => !p)}>{preview ? "Edit" : "Preview"}</button>
      </div>
      <input type="hidden" name={name} value={value} />
      {preview ? (
        <div className="prose-store min-h-[240px] rounded-md border border-black/10 p-3 !text-[15px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || "<p>Nothing yet.</p>" }} />
      ) : (
        <textarea id={`md-${name}`} rows={rows} className="field" value={value} onChange={(e) => setValue(e.target.value)} aria-describedby={`md-${name}-hint`} />
      )}
      <p id={`md-${name}-hint`} className="hint">## Heading, **bold**, *italic*, - list item, [link](https://…). Leave a blank line between paragraphs.</p>
    </div>
  );
}
