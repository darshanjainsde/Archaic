"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/** Record (or upload) the voice note that the QR on the card plays. */
export function VoiceNote({ number, itemId, current, locked }: { number: string; itemId: string; current: string | null; locked: boolean }) {
  const router = useRouter();
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(current);
  const file = useRef<HTMLInputElement>(null);
  const chunks = useRef<Blob[]>([]);
  const canRecord = typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => { if (!rec) return; const t = setInterval(() => setSecs((s) => { if (s + 1 >= 60) rec.stop(); return s + 1; }), 1000); return () => clearInterval(t); }, [rec]);

  async function send(blob: Blob, name: string) {
    setBusy(true);
    const fd = new FormData(); fd.append("number", number); fd.append("item", itemId); fd.append("file", new File([blob], name, { type: blob.type || "audio/webm" }));
    try {
      const r = await fetch("/api/voice", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      setPreview(j.url); toast.success("Voice note saved. It plays when they scan the card."); router.refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); } finally { setBusy(false); }
  }
  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => { stream.getTracks().forEach((t) => t.stop()); setRec(null); const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" }); if (blob.size) send(blob, `note.${r.mimeType.includes("mp4") ? "m4a" : "webm"}`); };
      r.start(); setSecs(0); setRec(r);
    } catch { toast.error("We couldn’t use the microphone. Allow it in your browser, or upload a recording instead."); }
  }

  return (
    <div className="grid gap-3 rounded bg-surface p-4" style={{ borderRadius: "var(--radius)" }}>
      <div><b>Your voice note</b><p className="text-[14px] text-muted">{locked ? "The box is packed, so the voice note is final." : "Up to a minute. Record it here or upload one from your phone. You can replace it until we pack the box."}</p></div>
      {preview && <audio controls src={preview} className="w-full" preload="none">Your browser can’t play audio.</audio>}
      {!locked && (
        <div className="flex flex-wrap gap-2">
          {canRecord && (rec
            ? <button type="button" className="btn btn-primary" onClick={() => rec.stop()}><Square size={16} aria-hidden /> Stop · 0:{String(secs).padStart(2, "0")}</button>
            : <button type="button" className="btn btn-primary" disabled={busy} onClick={start}><Mic size={16} aria-hidden /> {preview ? "Record again" : "Record now"}</button>)}
          <button type="button" className="btn btn-ghost" disabled={busy || !!rec} onClick={() => file.current?.click()}><Upload size={16} aria-hidden /> {busy ? "Saving…" : "Upload a recording"}</button>
          <input ref={file} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) send(f, f.name); }} />
        </div>
      )}
    </div>
  );
}
