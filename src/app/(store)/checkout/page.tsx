import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/google-oauth";
import { db } from "@/lib/db";
import { getSettings, availablePaymentMethods } from "@/lib/settings";
import { CheckoutView } from "@/components/checkout/checkout-view";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ buy?: string }> }) {
  const { buy } = await searchParams;
  const user = await getCurrentUser();
  const [s, addresses] = await Promise.all([
    getSettings(),
    !user ? Promise.resolve([]) : db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
  ]);
  const methods = availablePaymentMethods(s);
  return (
    <div className="container-x py-10 md:py-16">
      <h1 className="mb-8 text-5xl md:text-6xl">Checkout</h1>
      <CheckoutView
        user={{ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? null }}
        guest={!user}
        buyNow={buy === "1"}
        signInHref="/login?next=/checkout"
        googleHref={googleEnabled() ? "/api/auth/google?next=%2Fcheckout" : null}
        addresses={addresses.map((a) => ({ id: a.id, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault }))}
        methods={methods}
        codFee={s.commerce.codFee}
        codMaxOrder={s.commerce.codMaxOrder}
        giftWrapEnabled={s.commerce.giftWrapEnabled}
        giftWrapPrice={s.commerce.giftWrapPrice}
        storeName={s.store.name}
        accent={s.theme.colors.accent}
        deliveryText={`Dispatched within ${s.commerce.dispatchDays} working days, delivered in ${s.commerce.deliveryDaysMin}–${s.commerce.deliveryDaysMax} days.`}
      />
    </div>
  );
}
