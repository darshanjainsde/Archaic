"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { Img } from "@/components/ui/img";
import { uploadFiles } from "./upload";

/** Single image picker: upload or paste URL. Optionally writes into a hidden input for <form> submission. */
export function ImageField({ label, value, onChange, name, hint }: { label: string; value: string | null | undefined; onChange?: (url: string | null) => void; name?: string; hint?: string }) {
  const [url, setUrl] = useState<string>(value ?? "");
  const [busy, setBusy] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const set = (v: string) => { setUrl(v); onChange?.(v || null); };

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(0);
    try {
      const [u] = await uploadFiles([list[0]], setBusy);
      set(u);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      {name && <input type="hidden" name={name} value={url} />}
      <div className="flex items-start gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-black/10 bg-field">
          {url ? <Img src={url} alt="" fill sizes="80px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-[12px] text-muted">None</span>}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => input.current?.click()} disabled={busy !== null}>
              <Upload size={15} aria-hidden /> {busy !== null ? `Uploading ${busy}%` : "Upload"}
            </button>
            {url && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("")}><X size={15} aria-hidden />Remove</button>}
          </div>
          <input aria-label={`${label} URL`} className="field !min-h-[38px] !py-1.5 text-[14px]" placeholder="or paste an image URL" value={url} onChange={(e) => set(e.target.value.trim())} />
          {hint && <p className="hint">{hint}</p>}
        </div>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="hidden" onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}
