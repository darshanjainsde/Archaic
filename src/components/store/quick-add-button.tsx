"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addWithDefaults } from "@/lib/quick-add";

/** The "+ Add" on a parcel card, for products with no required choices. Adds one and confirms on the button for a moment. */
export function QuickAddButton({ id, slug, name, price, image }: { id: string; slug: string; name: string; price: number; image: string | null }) {
  const router = useRouter();
  const [done, setDone] = useState(0);
  const [showDone, setShowDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    setShowDone(true);
    const t = setTimeout(() => setShowDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);

  function add() {
    const r = addWithDefaults({ id, slug, name, price, image, options: [], personalization: null });
    if (r === "invalid") { router.push(`/product/${slug}`); return; }
    if (r === "max") { toast("You already have the most we can send of this", { action: { label: "View bag", onClick: () => router.push("/cart") } }); return; }
    setDone((n) => n + 1);
    toast.success(`${name} added to your bag`, { action: { label: "View bag", onClick: () => router.push("/cart") } });
  }

  return (
    <button type="button" className="parcel-add" onClick={add} aria-label={`Add ${name} to bag`}>
      {showDone ? <span key={done} className="is-added">✓ Added</span> : "+ Add"}
    </button>
  );
}
