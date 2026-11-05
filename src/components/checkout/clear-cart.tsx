"use client";
import { useEffect } from "react";
import { cart, express } from "@/lib/cart-store";

/** On the thank-you page: a Buy-now order clears only its express item; a bag order empties the bag. */
export function ClearCart({ number }: { number?: string }) {
  useEffect(() => {
    if (number && express.wasExpress(number)) express.clear();
    else cart.clear();
  }, [number]);
  return null;
}
