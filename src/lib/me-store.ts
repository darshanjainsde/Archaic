"use client";
import { useEffect, useSyncExternalStore } from "react";
import { myState } from "@/actions/store";

/**
 * The visitor, for pages served from the CDN: signed-in state comes from the ac_hint cookie straight away,
 * the wishlist (and the visitor's review of a product) from one server call made only when signed in.
 * Once a day an anonymous-looking browser asks the server once, so older sessions get their hint cookie.
 */
type Review = { rating: number; title: string | null; body: string };
type Me = { role: "u" | "a" | null; wishlist: Set<string>; loaded: boolean; reviews: Map<string, Review | null> };
const EMPTY: Me = { role: null, wishlist: new Set(), loaded: false, reviews: new Map() };
let me: Me = EMPTY;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
let inflight: Promise<void> | null = null;

function hint(): "u" | "a" | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)ac_hint=([ua])/);
  return m ? (m[1] as "u" | "a") : null;
}

function load(productId?: string) {
  const role = hint();
  if (!role) {
    // Bootstrap once a day for sessions that started before the hint cookie existed.
    let checked = false;
    try { checked = Number(localStorage.getItem("ac_hint_checked") ?? 0) > Date.now() - 86_400_000; } catch {}
    if (checked) { if (!me.loaded) { me = { ...EMPTY, loaded: true }; emit(); } return; }
    try { localStorage.setItem("ac_hint_checked", String(Date.now())); } catch {}
  }
  if (!productId && (inflight || me.loaded)) return;
  if (productId && me.reviews.has(productId)) return;
  if (role && !me.loaded) { me = { ...me, role }; emit(); }
  inflight = myState(productId ?? null).then((r) => {
    const reviews = new Map(me.reviews);
    if (productId) reviews.set(productId, r.review);
    me = { role: r.role, wishlist: new Set(r.wishlist), loaded: true, reviews };
    emit();
  }).catch(() => { me = { ...me, role: hint(), loaded: true }; emit(); }).finally(() => { inflight = null; });
}

export function useMe(productId?: string) {
  const s = useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => me, () => EMPTY);
  useEffect(() => { load(productId); }, [productId]);
  return s;
}
export const meStore = {
  setWish(id: string, on: boolean) { const w = new Set(me.wishlist); if (on) w.add(id); else w.delete(id); me = { ...me, wishlist: w }; emit(); },
};
