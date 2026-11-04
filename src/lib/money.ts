const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** Format integer paise as rupees, e.g. 129900 -> "₹1,299" */
export function formatMoney(paise: number | null | undefined): string {
  const v = Number.isFinite(paise as number) ? (paise as number) : 0;
  return inr.format(Math.round(v) / 100);
}

/** Parse a rupee amount typed by an admin ("1,299.50") into paise. Returns null if invalid. */
export function rupeesToPaise(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input).replace(/[₹,\s]/g, "").trim();
  if (s === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

export function paiseToRupeesString(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "";
  const r = paise / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

export function discountPercent(price: number, compareAt?: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
