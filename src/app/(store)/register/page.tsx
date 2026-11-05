import type { Metadata } from "next";
import { redirectIfSignedIn } from "@/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/forms";
import { GoogleButton } from "@/components/auth/google-button";
import { getSettings } from "@/lib/settings";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const n = safeNext(next, "");
  await redirectIfSignedIn(n || undefined);
  const s = await getSettings();
  return (
    <AuthShell title="Create an account" text={s.membership.enabled ? `You join ${s.membership.name} automatically — every order counts towards member discounts and free gift wrap.` : "Track your orders and check out faster."}>
      <GoogleButton next={n} className="mb-5" />
      <RegisterForm next={n} />
    </AuthShell>
  );
}
