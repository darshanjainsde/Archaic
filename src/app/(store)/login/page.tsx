import type { Metadata } from "next";
import { redirectIfSignedIn } from "@/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { GoogleButton, AUTH_ERRORS } from "@/components/auth/google-button";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const n = safeNext(next, "");
  await redirectIfSignedIn(n || undefined);
  return (
    <AuthShell title="Welcome back" text="Sign in to check out, track your orders and see your member price.">
      {error && AUTH_ERRORS[error] && <p role="alert" className="mb-5 bg-surface p-4 text-[16px]" style={{ borderRadius: "var(--radius)" }}>{AUTH_ERRORS[error]}</p>}
      <GoogleButton next={n} className="mb-5" />
      <LoginForm next={n} />
    </AuthShell>
  );
}
