"use client";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ImageUp, Trash2 } from "lucide-react";
import { Img } from "@/components/ui/img";
import { uploadFiles } from "./upload";

/** Upload progress bar (0–100). */
export function Progress({ pct, label = "Uploading" }: { pct: number; label?: string }) {
  return (
    <div className="w-full" role="status" aria-live="polite">
      <div className="mb-1 flex justify-between text-[14px]"><span>{label}…</span><span className="tabular-nums">{pct}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-ink transition-[width] duration-200" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/**
 * Single image picker. On phones: "Choose photo" opens the gallery/camera chooser, "Take photo" opens the camera.
 * Optionally writes into a hidden input for <form> submission.
 */
export function ImageField({ label, value, onChange, name, hint, aspect = "16/10" }: { label: string; value: string | null | undefined; onChange?: (url: string | null) => void; name?: string; hint?: string; aspect?: string }) {
  const [url, setUrl] = useState<string>(value ?? "");
  const [busy, setBusy] = useState<number | null>(null);
  const pick = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const id = useId();
  const set = (v: string) => { setUrl(v); onChange?.(v || null); };

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(0);
    try {
      const [u] = await uploadFiles([list[0]], setBusy);
      set(u);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      if (pick.current) pick.current.value = "";
      if (cam.current) cam.current.value = "";
    }
  }

  return (
    <div className="min-w-0">
      <span className="label" id={`${id}-l`}>{label}</span>
      {name && <input type="hidden" name={name} value={url} />}
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-lg border border-black/10 bg-field/60" style={{ aspectRatio: aspect }}>
        {url ? <Img src={url} alt={`${label} preview`} fill sizes="(max-width: 768px) 100vw, 480px" className="object-cover" /> : (
          <button type="button" onClick={() => pick.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-2 text-[15px] text-muted" aria-describedby={`${id}-l`}>
            <ImageUp size={28} aria-hidden />No image yet. Tap to add one
          </button>
        )}
        {busy !== null && <div className="absolute inset-x-0 bottom-0 bg-surface/95 p-3"><Progress pct={busy} /></div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => pick.current?.click()} disabled={busy !== null}>
          <ImageUp size={18} aria-hidden /> {url ? "Replace photo" : "Choose photo"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm hidden pointer-coarse:inline-flex" onClick={() => cam.current?.click()} disabled={busy !== null}>
          <Camera size={18} aria-hidden /> Take photo
        </button>
        {url && <button type="button" className="text-btn is-danger" onClick={() => set("")} disabled={busy !== null}><Trash2 size={18} aria-hidden />Remove</button>}
      </div>
      {hint && <p className="hint">{hint}</p>}
      <details className="mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-[14px] text-muted underline underline-offset-4">Use an image web address instead</summary>
        <input aria-label={`${label} web address`} className="field mt-2" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://… or /uploads/…" value={url} onChange={(e) => set(e.target.value.trim())} />
      </details>
      <input ref={pick} type="file" accept="image/*" className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}
