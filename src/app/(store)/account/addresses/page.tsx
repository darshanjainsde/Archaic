import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddressesManager } from "@/components/account/addresses-manager";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const rows = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <div className="space-y-6">
      <h1 className="text-5xl md:text-6xl">Addresses</h1>
      <AddressesManager addresses={rows.map((a) => ({ id: a.id, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "", city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault }))} />
    </div>
  );
}
