import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileForm, PasswordForm } from "@/components/account/profile-forms";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage() {
  const u = await requireUser("/account/profile");
  const row = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { marketingOptIn: true } });
  return (
    <div className="space-y-10">
      <h1 className="text-5xl md:text-6xl">Profile</h1>
      <div className="grid gap-8 xl:grid-cols-2">
        <section className="bg-surface p-6 md:p-8" style={{ borderRadius: "var(--radius)" }} aria-labelledby="pd-h">
          <h2 id="pd-h" className="mb-5 text-3xl">Your details</h2>
          <ProfileForm name={u.name} email={u.email} phone={u.phone ?? ""} marketing={row.marketingOptIn} />
        </section>
        <section className="bg-surface p-6 md:p-8" style={{ borderRadius: "var(--radius)" }} aria-labelledby="pw-h">
          <h2 id="pw-h" className="mb-5 text-3xl">Password</h2>
          <PasswordForm />
        </section>
      </div>
    </div>
  );
}
