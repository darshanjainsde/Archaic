import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Email confirmation link: proves the owner of this email, which unlocks orders they placed as a guest. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const rec = token ? await db.passwordResetToken.findUnique({ where: { tokenHash: hash } }) : null;
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return NextResponse.redirect(siteUrl("/account?verify=expired"));
  await db.$transaction([
    db.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: rec.userId }, data: { emailVerified: true } }),
  ]);
  return NextResponse.redirect(siteUrl("/account?verify=done"));
}
