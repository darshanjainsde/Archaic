import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell title="Forgot your password?" text="Enter the email you signed up with and we will send you a link to choose a new one.">
      <ForgotForm />
    </AuthShell>
  );
}
