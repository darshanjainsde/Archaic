import type { Metadata } from "next";
import { redirectIfSignedIn } from "@/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const n = safeNext(next, "");
  await redirectIfSignedIn(n || undefined);
  return (
    <AuthShell title="Welcome back" text="Sign in to check out, track your orders and see your member price.">
      <LoginForm next={n} />
    </AuthShell>
  );
}
