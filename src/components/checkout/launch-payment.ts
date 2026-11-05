"use client";
import type { GatewayLaunch } from "@/actions/checkout";
import { verifyRazorpayPayment, reportPaymentFailure } from "@/actions/checkout";

const loading = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  const existing = loading.get(src);
  if (existing) return existing;
  const p = new Promise<void>((resolve, reject) => {
    const already = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (already && already.dataset.loaded === "1") return resolve();
    const el = already ?? document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => { el.dataset.loaded = "1"; resolve(); };
    el.onerror = () => { loading.delete(src); el.remove(); reject(new Error("Could not load the payment window. Check your connection and try again.")); };
    if (!already) document.body.appendChild(el);
  });
  loading.set(src, p);
  return p;
}

type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: { error?: { description?: string } }) => void) => void };
type CashfreeFactory = (opts: { mode: string }) => { checkout: (o: { paymentSessionId: string; redirectTarget: string }) => Promise<{ error?: { message?: string } } | undefined> };

/**
 * Opens the right gateway. Resolves with:
 *  - "paid" when the payment is verified (Razorpay) or the order is COD
 *  - "redirect" when Cashfree navigates away
 *  - "dismissed" when the customer closed the window
 * Throws on errors.
 */
export async function launchPayment(launch: GatewayLaunch, theme: string): Promise<"paid" | "redirect" | "dismissed" | "checked"> {
  if (launch.kind === "cod") return "paid";
  if (launch.kind === "cashfree") {
    await loadScript("https://sdk.cashfree.com/js/v3/cashfree.js");
    const factory = (window as unknown as { Cashfree?: CashfreeFactory }).Cashfree;
    if (!factory) throw new Error("Cashfree could not be loaded");
    const cf = factory({ mode: launch.mode });
    // Pay in a popup on this page (no trip away and back). If the popup can't open, fall back to Cashfree's page.
    try {
      const res = await cf.checkout({ paymentSessionId: launch.paymentSessionId, redirectTarget: "_modal" });
      if (res && "redirect" in (res as object)) return "redirect";
      return "checked"; // closed, paid or failed: the server verifies with Cashfree on the return page
    } catch {
      const res = await cf.checkout({ paymentSessionId: launch.paymentSessionId, redirectTarget: "_self" });
      if (res?.error) throw new Error(res.error.message || "Payment could not be started");
      return "redirect";
    }
  }
  await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  const Rzp = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
  if (!Rzp) throw new Error("Razorpay could not be loaded");
  return new Promise((resolve, reject) => {
    let settled = false;
    const rzp = new Rzp({
      key: launch.keyId,
      amount: launch.amount,
      currency: "INR",
      name: launch.storeName,
      description: `Order ${launch.number}`,
      order_id: launch.razorpayOrderId,
      prefill: launch.prefill,
      notes: { orderNumber: launch.number },
      theme: { color: theme },
      handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        settled = true;
        try {
          const v = await verifyRazorpayPayment({ number: launch.number, ...r });
          if (v.ok) resolve("paid");
          else reject(new Error(v.error || "Payment could not be verified"));
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () => {
          if (settled) return;
          settled = true;
          reportPaymentFailure(launch.number, "Payment window closed").catch(() => {});
          resolve("dismissed");
        },
      },
    });
    rzp.on("payment.failed", (r) => {
      reportPaymentFailure(launch.number, r?.error?.description || "Payment failed").catch(() => {});
    });
    rzp.open();
  });
}
