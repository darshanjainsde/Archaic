import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { CartView } from "@/components/checkout/cart-view";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };

export default async function CartPage() {
  const [s, user] = await Promise.all([getSettings(), getCurrentUser()]);
  return (
    <div className="container-x py-10 md:py-16">
      <h1 className="mb-8 text-5xl md:text-6xl">Your bag</h1>
      <CartView
        signedIn={Boolean(user)}
        threshold={s.commerce.freeShippingThreshold}
        giftWrapEnabled={s.commerce.giftWrapEnabled}
        giftWrapPrice={s.commerce.giftWrapPrice}
        maxQtyPerLine={s.commerce.maxQtyPerLine}
        taxNote={s.commerce.taxNote}
        membershipName={s.membership.enabled ? s.membership.name : null}
      />
    </div>
  );
}
