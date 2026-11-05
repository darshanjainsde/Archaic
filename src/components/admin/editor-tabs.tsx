"use client";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Section switcher for long editors. Phones get one labelled dropdown (every section visible in the list,
 * nothing scrolled off-screen); 768 px and up get a sticky row of tabs. The choice is kept in ?tab= so it can be linked.
 */
export function EditorTabs<T extends string>({ tabs, value, onChange, extra }: { tabs: [T, string][]; value: T; onChange: (t: T) => void; extra?: React.ReactNode }) {
  const id = useId();
  const pick = (t: T) => {
    onChange(t);
    const u = new URL(window.location.href);
    u.searchParams.set("tab", t);
    window.history.replaceState(null, "", u);
  };
  return (
    <>
      <div className="mb-6 md:hidden">
        <label className="label" htmlFor={id}>Editing</label>
        <div className="flex gap-2">
          <select id={id} className="field min-w-0 flex-1 font-semibold" value={value} onChange={(e) => pick(e.target.value as T)}>
            {tabs.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {extra}
        </div>
      </div>
      <div className="sticky top-14 z-30 -mx-6 mb-6 hidden items-center gap-2 border-b border-black/10 bg-bg/95 px-6 py-2 backdrop-blur md:flex">
        <div role="tablist" className="flex min-w-0 flex-1 flex-wrap gap-1">
          {tabs.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={value === k} onClick={() => pick(k)} className={cn("min-h-11 whitespace-nowrap rounded-lg px-4 text-[15px] font-medium transition-colors", value === k ? "bg-ink text-bg" : "hover:bg-black/5")}>{l}</button>
          ))}
        </div>
        {extra}
      </div>
    </>
  );
}
