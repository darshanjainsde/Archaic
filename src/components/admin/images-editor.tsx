"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Camera, ImagePlus, Star, Trash2 } from "lucide-react";
import { Img } from "@/components/ui/img";
import { uploadFiles } from "./upload";
import { Progress } from "./image-field";
import { useConfirm } from "./confirm";
import { cn } from "@/lib/utils";

export type EditableImage = { url: string; alt: string };

export function ImagesEditor({ images, onChange }: { images: EditableImage[]; onChange: (next: EditableImage[]) => void }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState("");
  const pick = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  async function add(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!imgs.length) return;
    if (images.length + imgs.length > 20) return toast.error("A product can have up to 20 images. Remove some first.");
    setProgress(0);
    try {
      const urls = await uploadFiles(imgs.slice(0, 10), setProgress);
      onChange([...images, ...urls.map((url) => ({ url, alt: "" }))]);
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} uploaded`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProgress(null);
      if (pick.current) pick.current.value = "";
      if (cam.current) cam.current.value = "";
    }
  }
  const move = (i: number, j: number) => {
    if (j < 0 || j >= images.length || i === j) return;
    const next = [...images];
    const [x] = next.splice(i, 1);
    next.splice(j, 0, x);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(Array.from(e.dataTransfer.files)); }}
        className={cn("flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center", drag ? "border-ink bg-field" : "border-black/15")}
      >
        {progress !== null ? <div className="w-full max-w-sm"><Progress pct={progress} /></div> : (
          <>
            <ImagePlus size={28} aria-hidden />
            <p className="text-[15px]">Add photos from your phone or computer<span className="hidden pointer-fine:inline">, or drag them here</span></p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => pick.current?.click()}><ImagePlus size={18} aria-hidden />Choose photos</button>
              <button type="button" className="btn btn-ghost btn-sm hidden pointer-coarse:inline-flex" onClick={() => cam.current?.click()}><Camera size={18} aria-hidden />Take photo</button>
            </div>
          </>
        )}
        <p className="text-[14px] text-muted">Up to 10 at a time. Large phone photos are resized for you. The first image is the cover.</p>
        <input ref={pick} type="file" multiple accept="image/*" className="hidden" onChange={(e) => add(Array.from(e.target.files ?? []))} />
        <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => add(Array.from(e.target.files ?? []))} />
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((im, i) => (
            <li key={im.url + i} className="min-w-0 rounded-lg border border-black/10 bg-surface p-3">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-field">
                <Img src={im.url} alt={im.alt || `Product image ${i + 1}`} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-semibold text-bg">{i === 0 ? "Cover" : `Photo ${i + 1}`}</span>
              </div>
              <label className="sr-only" htmlFor={`alt-${i}`}>Describe image {i + 1}</label>
              <input id={`alt-${i}`} className="field mt-3" placeholder="Describe it, e.g. Amber jar, lid off…" autoComplete="off" value={im.alt} onChange={(e) => onChange(images.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)))} />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                <div className="flex">
                  <button type="button" aria-label={`Move image ${i + 1} earlier`} className="icon-btn" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowLeft size={20} aria-hidden /></button>
                  <button type="button" aria-label={`Move image ${i + 1} later`} className="icon-btn" disabled={i === images.length - 1} onClick={() => move(i, i + 1)}><ArrowRight size={20} aria-hidden /></button>
                  {i > 0 && <button type="button" className="text-btn" onClick={() => move(i, 0)}><Star size={18} aria-hidden />Make cover</button>}
                </div>
                <button type="button" aria-label={`Remove image ${i + 1}`} className="icon-btn is-danger" onClick={async () => { if (await confirm({ title: "Remove this image?", body: "It is removed from the product when you save.", confirmLabel: "Remove", danger: true })) onChange(images.filter((_, k) => k !== i)); }}><Trash2 size={20} aria-hidden /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details>
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-[14px] text-muted underline underline-offset-4">Add an image by web address</summary>
        <div className="mt-2 flex gap-2">
          <input className="field" placeholder="https://…" aria-label="Image web address" inputMode="url" autoComplete="off" spellCheck={false} value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button type="button" className="btn btn-ghost" onClick={() => {
            const u = paste.trim();
            if (!/^(https:\/\/|\/)/.test(u)) return toast.error("Use an address that starts with https:// or /");
            onChange([...images, { url: u, alt: "" }]);
            setPaste("");
          }}>Add</button>
        </div>
      </details>
    </div>
  );
}
