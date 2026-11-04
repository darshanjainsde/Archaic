"use client";
import { useActionState } from "react";
import { subscribeNewsletter } from "@/actions/store";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

export function NewsletterForm({ id = "newsletter", tone = "default" }: { id?: string; tone?: "default" | "field" }) {
  const [state, action] = useActionState(subscribeNewsletter, null);
  return (
    <form action={action} className="w-full max-w-lg" noValidate>
      <label htmlFor={`${id}-email`} className="label">Your email</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id={`${id}-email`} name="email" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" className={cn("field flex-1", tone === "field" && "!text-field-ink")} aria-describedby={`${id}-msg`} aria-invalid={state && !state.ok ? true : undefined} />
        <SubmitButton variant={tone === "field" ? "ink" : "primary"} pendingText="Joining…">Join the letters</SubmitButton>
      </div>
      <p id={`${id}-msg`} role="status" className={cn("mt-2 min-h-[1.4em] text-[14px]", state && !state.ok && "text-sale")}>{state?.message ?? ""}</p>
    </form>
  );
}
