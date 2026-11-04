import { Star } from "lucide-react";

export function Stars({ value, size = 16, label }: { value: number; size?: number; label?: string }) {
  const v = Math.max(0, Math.min(5, value));
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${v.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} strokeWidth={1.5} className={i <= Math.round(v) ? "fill-current" : "opacity-35"} aria-hidden />
      ))}
    </span>
  );
}
