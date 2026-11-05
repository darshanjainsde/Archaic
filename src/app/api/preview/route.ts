import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Admin-only: preview a draft product page. `?off=1` leaves preview mode. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const dm = await draftMode();
  if (url.searchParams.get("off")) { dm.disable(); return NextResponse.redirect(new URL("/", req.url)); }
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  const slug = (url.searchParams.get("slug") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 120);
  dm.enable();
  return NextResponse.redirect(new URL(slug ? `/product/${slug}` : "/", req.url));
}
