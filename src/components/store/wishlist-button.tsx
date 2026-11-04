"use client";
import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleWishlist } from "@/actions/store";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId, initial = false, className, withLabel = false }: { productId: string; initial?: boolean; className?: string; withLabel?: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const prev = on;
    setOn(!prev);
    start(async () => {
      const res = await toggleWishlist(productId);
      if (res.needsLogin) {
        setOn(prev);
        toast("Sign in to save to your wishlist", { action: { label: "Sign in", onClick: () => router.push(`/login?next=${encodeURIComponent(pathname)}`) } });
        return;
      }
      if (!res.ok) { setOn(prev); toast.error(res.message ?? "Could not update wishlist"); return; }
      setOn(Boolean(res.wishlisted));
      toast(res.wishlisted ? "Saved to your wishlist" : "Removed from your wishlist");
    });
  };
  return (
    <button type="button" onClick={click} disabled={pending} aria-pressed={on} aria-label={on ? "Remove from wishlist" : "Save to wishlist"} className={cn("inline-flex items-center gap-2 transition-transform active:scale-90", className)}>
      <Heart size={20} className={cn(on && "fill-current")} aria-hidden />
      {withLabel && <span className="text-[15px] font-semibold">{on ? "Saved" : "Save"}</span>}
    </button>
  );
}
