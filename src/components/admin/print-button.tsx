"use client";
export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="btn btn-ink btn-sm print:hidden">Print</button>;
}
