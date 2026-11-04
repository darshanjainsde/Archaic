"use client";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, className, pendingText, variant = "primary", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string; variant?: "primary" | "ink" | "ghost" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || rest.disabled} aria-busy={pending} className={cn("btn", `btn-${variant}`, className)} {...rest}>
      {pending && <Loader2 className="animate-spin" size={16} aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
