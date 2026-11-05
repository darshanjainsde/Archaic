"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function AnnouncementBar({ messages, href }: { messages: string[]; href?: string }) {
  const list = messages.filter((m) => m.trim());
  const [i, setI] = useState(0);
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    if (list.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => { setI((x) => (x + 1) % list.length); setTicks((t) => t + 1); }, 4500);
    return () => clearInterval(t);
  }, [list.length]);
  if (!list.length) return null;
  const text = list[i % list.length];
  const inner = (
    // The first message is painted at once (above the fold); only later rotations slide in.
    <span key={i} className={`${ticks > 0 ? "rise " : ""}block truncate`} aria-live="polite">
      {text}
    </span>
  );
  return (
    <div className="bg-accent text-accent-ink">
      <div className="container-x flex h-9 items-center justify-center text-center text-[14px] font-medium">
        {href ? <Link href={href} className="flex h-full min-w-0 items-center hover:underline underline-offset-4">{inner}</Link> : inner}
      </div>
    </div>
  );
}
