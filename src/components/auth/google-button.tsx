import { googleEnabled } from "@/lib/google-oauth";

/** "Continue with Google" + an "or" divider. Renders nothing until the Google keys are set. */
export function GoogleButton({ next = "", className = "" }: { next?: string; className?: string }) {
  if (!googleEnabled()) return null;
  return (
    <div className={className}>
      <a href={`/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="btn btn-ghost w-full gap-3" data-testid="google-signin">
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.4-4.7 7.1l7.3 5.7c4.3-4 6.8-9.9 6.8-17.3z" /><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.6 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
        Continue with Google
      </a>
      <div className="mt-5 flex items-center gap-3 text-[14px] text-muted" aria-hidden="true"><span className="h-px flex-1 bg-current opacity-25" />or<span className="h-px flex-1 bg-current opacity-25" /></div>
    </div>
  );
}

export const AUTH_ERRORS: Record<string, string> = {
  google_off: "Google sign-in is not available right now. Please use your email.",
  google_cancelled: "Google sign-in was cancelled. You can try again or use your email.",
  google_failed: "We could not sign you in with Google. Please try again or use your email.",
  admin_password: "This account signs in with a password only. Please use the form below.",
};
