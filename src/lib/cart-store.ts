"use client";
import { useSyncExternalStore } from "react";
import type { CartLine } from "./types";

/** Client-side bag persisted to localStorage, synced across tabs. Prices are estimates; the server re-quotes at checkout. */
const KEY = "ac_cart_v1";
type State = { lines: CartLine[]; couponCode: string | null; giftWrap: boolean; giftMessage: string };
const EMPTY: State = { lines: [], couponCode: null, giftWrap: false, giftMessage: "" };

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.lines)) state = { ...EMPTY, ...parsed, lines: parsed.lines.filter((l: CartLine) => l && l.productId && l.quantity > 0) };
    }
  } catch {
    state = EMPTY;
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try { state = e.newValue ? { ...EMPTY, ...JSON.parse(e.newValue) } : EMPTY; } catch { state = EMPTY; }
    listeners.forEach((l) => l());
  });
}

function set(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCart() {
  const s = useSyncExternalStore(subscribe, () => { load(); return state; }, () => EMPTY);
  const count = s.lines.reduce((a, l) => a + l.quantity, 0);
  const estimate = s.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
  return { ...s, count, estimate };
}

export const cart = {
  get: () => { load(); return state; },
  add(line: CartLine, maxQty = 10) {
    load();
    const existing = state.lines.find((l) => l.key === line.key);
    const lines = existing
      ? state.lines.map((l) => (l.key === line.key ? { ...l, quantity: Math.min(maxQty, l.quantity + line.quantity), unitPrice: line.unitPrice } : l))
      : [...state.lines, { ...line, quantity: Math.min(maxQty, line.quantity) }];
    set({ ...state, lines });
  },
  setQty(key: string, qty: number, maxQty = 10) {
    load();
    const q = Math.max(0, Math.min(maxQty, Math.trunc(qty)));
    set({ ...state, lines: q === 0 ? state.lines.filter((l) => l.key !== key) : state.lines.map((l) => (l.key === key ? { ...l, quantity: q } : l)) });
  },
  remove(key: string) { load(); set({ ...state, lines: state.lines.filter((l) => l.key !== key) }); },
  setCoupon(code: string | null) { load(); set({ ...state, couponCode: code ? code.trim().toUpperCase() : null }); },
  setGift(giftWrap: boolean, giftMessage?: string) { load(); set({ ...state, giftWrap, giftMessage: giftMessage ?? state.giftMessage }); },
  clear() { set({ ...EMPTY }); },
};

/* ---------- Buy now: a one-item express checkout that never touches the bag ---------- */
const XKEY = "ac_buynow_v1";
const DONE = "ac_buynow_done";
let xline: CartLine | null = null;
let xloaded = false;
const xlisteners = new Set<() => void>();
function xload() {
  if (xloaded || typeof window === "undefined") return;
  xloaded = true;
  try { const raw = sessionStorage.getItem(XKEY); xline = raw ? (JSON.parse(raw) as CartLine) : null; } catch { xline = null; }
}
function xset(next: CartLine | null) {
  xline = next;
  try { if (next) sessionStorage.setItem(XKEY, JSON.stringify(next)); else sessionStorage.removeItem(XKEY); } catch {}
  xlisteners.forEach((l) => l());
}
export const express = {
  /** Replace the express item (Buy now) and keep the bag as it is. */
  set(line: CartLine) { xload(); xset({ ...line, quantity: Math.max(1, line.quantity) }); },
  setQty(q: number, max = 10) { xload(); if (xline) xset({ ...xline, quantity: Math.max(1, Math.min(max, Math.trunc(q))) }); },
  get: () => { xload(); return xline; },
  clear() { xset(null); },
  /** Remember which order came from Buy now, so the thank-you page clears the express item, not the bag. */
  markPlaced(number: string) { try { sessionStorage.setItem(DONE, number); } catch {} },
  wasExpress(number: string) { try { return sessionStorage.getItem(DONE) === number; } catch { return false; } },
};
export function useExpress() {
  return useSyncExternalStore(
    (cb) => { xload(); xlisteners.add(cb); return () => xlisteners.delete(cb); },
    () => { xload(); return xline; },
    () => null,
  );
}
