"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return <button type="button" className="btn btn-primary print:hidden" onClick={() => window.print()}><Printer size={16} aria-hidden /> Print or save as PDF</button>;
}
