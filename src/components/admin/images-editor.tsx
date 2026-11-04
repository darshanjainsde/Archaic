"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ImagePlus, Trash2 } from "lucide-react";
import { Img } from "@/components/ui/img";
import { uploadFiles } from "./upload";
import { cn } from "@/lib/utils";

export type EditableImage = { url: string; alt: string };

export function ImagesEditor({ images, onChange }: { images: EditableImage[]; onChange: (next: EditableImage[]) => void }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function add(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    if (images.length + imgs.length > 20) return toast.error("A product can have up to 20 images");
    setProgress(0);
    try {
      const urls = await uploadFiles(imgs.slice(0, 10), setProgress);
      onChange([...images, ...urls.map((url) => ({ url, alt: "" }))]);
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} uploaded`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(Array.from(e.dataTransfer.files)); }}
        className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-[14px]", drag ? "border-ink bg-field" : "border-black/15")}
      >
        <ImagePlus size={22} aria-hidden />
        <div>{progress !== null ? `Uploading… ${progress}%` : "Drag photos here, or"}</div>
        <button type="button" className="btn btn-ghost btn-sm" disabled={progress !== null} onClick={() => input.current?.click()}>Choose files</button>
        <div className="text-[12px] text-muted">JPG, PNG, WebP, AVIF or GIF · up to 5 MB each. The first image is the cover.</div>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="hidden" onChange={(e) => add(Array.from(e.target.files ?? []))} />
      </div>
      <div className="flex gap-2">
        <input className="field !min-h-[40px] !py-2 text-[14px]" placeholder="Paste an image URL" aria-label="Image URL" value={paste} onChange={(e) => setPaste(e.target.value)} />
        <button type="button" className="btn btn-ghost btn-sm !min-h-[40px]" onClick={() => {
          const u = paste.trim();
          if (!/^(https:\/\/|\/)/.test(u)) return toast.error("Use an https:// URL or a /path");
          onChange([...images, { url: u, alt: "" }]);
          setPaste("");
        }}>Add</button>
      </div>
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((im, i) => (
            <li key={im.url + i} className="rounded-lg border border-black/10 bg-surface p-2">
              <div className="relative aspect-[4/5] overflow-hidden rounded bg-field">
                <Img src={im.url} alt={im.alt} fill sizes="200px" className="object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-ink px-1.5 text-[11px] font-semibold text-bg">Cover</span>}
              </div>
              <input className="field mt-2 !min-h-[34px] !py-1 text-[13px]" placeholder="Alt text" aria-label={`Alt text for image ${i + 1}`} value={im.alt} onChange={(e) => onChange(images.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)))} />
              <div className="mt-1 flex justify-between">
                <div className="flex">
                  <button type="button" aria-label="Move left" className="rounded p-1.5 hover:bg-black/5 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><ChevronLeft size={16} /></button>
                  <button type="button" aria-label="Move right" className="rounded p-1.5 hover:bg-black/5 disabled:opacity-30" disabled={i === images.length - 1} onClick={() => move(i, 1)}><ChevronRight size={16} /></button>
                </div>
                <button type="button" aria-label="Remove image" className="rounded p-1.5 text-sale hover:bg-red-50" onClick={() => onChange(images.filter((_, k) => k !== i))}><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
