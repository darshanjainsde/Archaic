import { discountPercent, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({ price, compareAt, className, size = "md" }: { price: number; compareAt?: number | null; className?: string; size?: "sm" | "md" | "lg" }) {
  const off = discountPercent(price, compareAt);
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-semibold tabular-nums", size === "lg" ? "text-2xl" : size === "sm" ? "text-[15px]" : "text-base")}>{formatMoney(price)}</span>
      {off > 0 && (
        <>
          <s className="text-[14px] tabular-nums opacity-60">{formatMoney(compareAt!)}</s>
          <span className="text-[14px] font-semibold text-sale">{off}% off</span>
        </>
      )}
    </span>
  );
}
