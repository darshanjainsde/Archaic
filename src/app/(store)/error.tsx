"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="container-x flex flex-col items-start gap-5 py-24">
      <h1 className="text-[44px] md:text-[64px]">Something flickered</h1>
      <p className="max-w-md text-[17px]">This page didn’t load properly. Your bag is safe on this device. Try again, or head back to the shop.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
        <Link href="/shop" className="btn btn-ghost">Go to the shop</Link>
      </div>
      {error.digest && <p className="text-[14px] text-muted">Reference: {error.digest}</p>}
    </div>
  );
}
