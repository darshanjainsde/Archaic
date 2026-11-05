"use client";
import Link from "next/link";
import { useActionState } from "react";
import { login, register, requestPasswordReset, resetPassword, type FormState } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordInput, TextField, FormAlert } from "./password-input";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(login, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert error={state?.error} />
      <TextField id="email" name="email" label="Email or mobile number" type="text" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required defaultValue={state?.values?.email} key={state?.values?.email} />
      <PasswordInput id="password" name="password" label="Password" autoComplete="current-password" />
      <div className="-my-2 flex justify-end"><Link href="/forgot-password" className="tap-y text-[15px] underline">Forgot password?</Link></div>
      <SubmitButton className="w-full" pendingText="Signing in…">Sign in</SubmitButton>
      <p className="text-[16px]">New here? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold underline">Create an account</Link></p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(register, undefined);
  const fe = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert error={state?.error} />
      {state?.ok && state.message && <p role="status" className="bg-surface p-4 text-[16px]" style={{ borderRadius: "var(--radius)" }}>{state.message}</p>}
      <TextField id="name" name="name" label="Full name" autoComplete="name" required error={fe.name} defaultValue={v.name} key={`n${v.name}`} maxLength={80} />
      <TextField id="email" name="email" label="Email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required error={fe.email} defaultValue={v.email} key={`e${v.email}`} />
      <TextField id="phone" name="phone" label="Mobile number (optional)" type="tel" inputMode="tel" autoComplete="tel-national" error={fe.phone} defaultValue={v.phone} key={`p${v.phone}`} maxLength={14} />
      <PasswordInput id="password" name="password" label="Password" autoComplete="new-password" error={fe.password} describedBy="pw-hint" />
      <p id="pw-hint" className="hint -mt-3">At least 8 characters, with a letter and a number.</p>
      <label className="flex cursor-pointer items-start gap-3 text-[16px]">
        <input type="checkbox" name="marketing" className="mt-1 h-5 w-5 accent-[var(--accent)]" />
        <span>Send me letters about new scents and offers (twice a month at most)</span>
      </label>
      <SubmitButton className="w-full" pendingText="Creating account…">Create account</SubmitButton>
      <p className="text-[16px]">Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold underline">Sign in</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, undefined);
  if (state?.ok) return <FormAlert message={state.message} />;
  return (
    <form action={action} className="space-y-5" noValidate>
      <TextField id="email" name="email" label="Email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required error={state?.fieldErrors?.email} />
      <SubmitButton className="w-full" pendingText="Sending…">Send reset link</SubmitButton>
      <p className="text-[16px]"><Link href="/login" className="underline">Back to sign in</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPassword, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormAlert error={state?.error} />
      {state?.error && <p className="text-[16px]"><Link href="/forgot-password" className="underline">Request a new link</Link></p>}
      <PasswordInput id="password" name="password" label="New password" autoComplete="new-password" error={fe.password} describedBy="pw-hint" />
      <p id="pw-hint" className="hint -mt-3">At least 8 characters, with a letter and a number.</p>
      <PasswordInput id="confirm" name="confirm" label="Confirm new password" autoComplete="new-password" error={fe.confirm} />
      <SubmitButton className="w-full" pendingText="Saving…">Save new password</SubmitButton>
    </form>
  );
}
