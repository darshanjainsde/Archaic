"use client";
import { useEffect, useRef, useState } from "react";
import { quoteAction } from "@/actions/checkout";
import type { Quote } from "@/lib/orders";
import type { CartLine } from "@/lib/types";

/** Debounced server quote for the current bag. Ignores out-of-order responses. */
export function useQuote(lines: CartLine[], couponCode: string | null, giftWrap: boolean, paymentMethod: string | null = null) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const sig = JSON.stringify([lines.map((l) => [l.productId, l.quantity, l.selections, l.personalization ?? null, l.box ?? null]), couponCode, giftWrap, paymentMethod]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = ++seq.current;
    if (lines.length === 0) { setQuote(null); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const q = await quoteAction({
          lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, selections: l.selections, personalization: l.personalization ?? null, box: l.box ?? null })),
          couponCode,
          giftWrap,
          paymentMethod,
        });
        if (id === seq.current) { setQuote(q); setError(null); }
      } catch {
        if (id === seq.current) setError("Could not update prices. Check your connection.");
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, tick]);

  return { quote, loading, error, refresh: () => setTick((n) => n + 1) };
}
