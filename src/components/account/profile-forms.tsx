"use client";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { updateProfile, changePassword, type ActionResult } from "@/actions/account";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordInput, TextField, FormAlert } from "@/components/auth/password-input";

export function ProfileForm({ name, email, phone, marketing }: { name: string; email: string; phone: string; marketing: boolean }) {
  const [state, action] = useActionState<ActionResult | undefined, FormData>(updateProfile, undefined);
  useEffect(() => { if (state?.ok) toast.success(state.message ?? "Saved"); }, [state]);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <TextField id="p-name" name="name" label="Full name" autoComplete="name" defaultValue={name} error={fe.name} required maxLength={80} />
      <div>
        <label className="label" htmlFor="p-email">Email</label>
        <input id="p-email" className="field opacity-70" value={email} readOnly aria-describedby="p-email-hint" />
        <p id="p-email-hint" className="hint">To change your email, write to us.</p>
      </div>
      <TextField id="p-phone" name="phone" label="Mobile number" type="tel" inputMode="tel" autoComplete="tel-national" defaultValue={phone} error={fe.phone} maxLength={14} />
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[16px]">
        <input type="checkbox" name="marketing" defaultChecked={marketing} className="mt-1 h-5 w-5 accent-[var(--accent)]" />
        <span>Send me letters about new scents and offers</span>
      </label>
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<ActionResult | undefined, FormData>(changePassword, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) { toast.success(state.message ?? "Password changed"); ref.current?.reset(); } }, [state]);
  const fe = state?.fieldErrors ?? {};
  return (
    <form ref={ref} action={action} className="space-y-5" noValidate>
      <FormAlert error={state?.error} />
      <PasswordInput id="pw-current" name="current" label="Current password" autoComplete="current-password" error={fe.current} />
      <PasswordInput id="pw-new" name="password" label="New password" autoComplete="new-password" error={fe.password} describedBy="pw-new-hint" />
      <p id="pw-new-hint" className="hint -mt-3">At least 8 characters, with a letter and a number.</p>
      <PasswordInput id="pw-confirm" name="confirm" label="Confirm new password" autoComplete="new-password" error={fe.confirm} />
      <SubmitButton pendingText="Saving…">Change password</SubmitButton>
    </form>
  );
}
