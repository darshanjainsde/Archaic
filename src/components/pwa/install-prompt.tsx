"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Offers "Add to home screen" on Android/desktop, and instructions on iOS Safari. Dismissal is remembered. */
export function InstallPrompt({ storeName }: { storeName: string }) {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem("ac_install_dismissed") === "1"; } catch {}
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (dismissed || standalone) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onBip = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); timer = setTimeout(() => setShow(true), 25000); };
    window.addEventListener("beforeinstallprompt", onBip);
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)) {
      const t = setTimeout(() => { setIos(true); setShow(true); }, 20000);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onBip); };
    }
    return () => { clearTimeout(timer); window.removeEventListener("beforeinstallprompt", onBip); };
  }, []);

  if (!show) return null;
  const dismiss = () => { setShow(false); try { localStorage.setItem("ac_install_dismissed", "1"); } catch {} };

  return (
    <div role="dialog" aria-label="Install the app" className="fixed inset-x-3 bottom-[calc(72px+var(--safe-bottom))] z-50 flex items-center gap-3 bg-paper p-4 text-paper-ink shadow-2xl lg:bottom-6 lg:left-auto lg:right-6 lg:w-96" style={{ borderRadius: "var(--radius)" }}>
      <div className="flex-1 text-[15px] leading-snug">
        <b>Add {storeName} to your home screen</b>
        <div className="mt-0.5 text-[14px] opacity-80">{ios ? "Tap Share, then “Add to Home Screen”." : "Shop faster and track orders like an app."}</div>
      </div>
      {!ios && evt && (
        <button className="btn btn-sm" style={{ background: "var(--paper-ink)", color: "var(--paper)" }} onClick={async () => { await evt.prompt(); dismiss(); }}>Install</button>
      )}
      <button aria-label="Dismiss" onClick={dismiss} className="p-2"><X size={18} /></button>
    </div>
  );
}
