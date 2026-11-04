"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { retryPayment } from "@/actions/checkout";
import { cart } from "@/lib/cart-store";
import { launchPayment } from "./launch-payment";
import { cn } from "@/lib/utils";

export function PayNowButton({ number, accent, label = "Pay now", className }: { number: string; accent: string; label?: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await retryPayment(number);
      if (!res.ok) { toast.error(res.error); return; }
      const outcome = await launchPayment(res.launch, accent);
      if (outcome === "paid") { cart.clear(); router.replace(`/order/${number}`); router.refresh(); }
      else if (outcome === "dismissed") toast("Payment not completed", { description: "You can try again any time." });
      else return; // redirecting to Cashfree; keep the spinner
    } catch (e) {
      toast.error((e as Error).message || "Payment failed");
    }
    setBusy(false);
  };
  return (
    <button type="button" onClick={go} disabled={busy} aria-busy={busy} className={cn("btn btn-primary", className)}>
      {busy && <Loader2 size={16} className="animate-spin" aria-hidden />} {label}
    </button>
  );
}
