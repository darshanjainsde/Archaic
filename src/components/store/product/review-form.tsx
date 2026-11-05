"use client";
import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReview } from "@/actions/store";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMe } from "@/lib/me-store";

export function ReviewForm({ productId, existing }: { productId: string; existing?: { rating: number; title: string | null; body: string } | null }) {
  const [state, action] = useActionState(submitReview, null);
  const [rating, setRating] = useState(existing?.rating ?? 5);
  return (
    <form action={action} className="flex flex-col gap-4 bg-surface p-5 md:p-7" style={{ borderRadius: "var(--radius)" }}>
      <h3 className="text-[24px]">{existing ? "Edit your review" : "Write a review"}</h3>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <fieldset>
        <legend className="label">Your rating</legend>
        <div role="radiogroup" aria-label="Rating" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className="p-1">
              <Star size={28} strokeWidth={1.5} className={cn(n <= rating ? "fill-current" : "opacity-35")} aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="rv-title" className="label">Title <span className="font-normal text-muted">(optional)</span></label>
        <input id="rv-title" name="title" maxLength={100} defaultValue={existing?.title ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor="rv-body" className="label">Your review</label>
        <textarea id="rv-body" name="body" required minLength={10} maxLength={2000} rows={4} defaultValue={existing?.body ?? ""} className="field" aria-describedby="rv-hint" />
        <p id="rv-hint" className="hint">At least 10 characters. How did it smell, burn, look?</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pendingText="Publishing…">{existing ? "Update review" : "Publish review"}</SubmitButton>
        {state && <p role="status" className={cn("text-[15px]", !state.ok && "text-sale")}>{state.message}</p>}
      </div>
    </form>
  );
}

/** Signed in: the review form (with their earlier review). Signed out: a sign-in link. Loaded in the browser so the page can be cached. */
export function ReviewArea({ productId, slug }: { productId: string; slug: string }) {
  const me = useMe(productId);
  if (!me.loaded && !me.role) return <div className="skeleton h-12 w-56" aria-hidden />;
  if (!me.role) return <Link href={`/login?next=${encodeURIComponent(`/product/${slug}#reviews`)}`} className="btn btn-ghost">Sign in to write a review</Link>;
  if (!me.reviews.has(productId)) return <div className="skeleton h-64" aria-hidden />;
  return <ReviewForm key={me.reviews.get(productId) ? "edit" : "new"} productId={productId} existing={me.reviews.get(productId) ?? null} />;
}
