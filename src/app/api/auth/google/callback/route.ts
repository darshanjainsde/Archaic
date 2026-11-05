import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { exchangeGoogleCode, readOauthState, googleEnabled, GOOGLE_COOKIE } from "@/lib/google-oauth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { safeNext, siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const fail = (code: string) => {
  const res = NextResponse.redirect(siteUrl(`/login?error=${code}`));
  res.cookies.delete({ name: GOOGLE_COOKIE, path: "/api/auth/google" });
  return res;
};

export async function GET(req: Request) {
  if (!googleEnabled()) return fail("google_off");
  const url = new URL(req.url);
  if (url.searchParams.get("error")) return fail("google_cancelled");
  if (!rateLimit(`google-cb:${await clientIp()}`, 30, 600_000).ok) return fail("google_failed");
  const cookie = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${GOOGLE_COOKIE}=`))?.slice(GOOGLE_COOKIE.length + 1);
  const saved = await readOauthState(cookie);
  const code = url.searchParams.get("code");
  if (!saved || !code || saved.state !== url.searchParams.get("state")) return fail("google_failed");
  const g = await exchangeGoogleCode(code, saved.verifier);
  if (!g) return fail("google_failed");

  let user = await db.user.findUnique({ where: { googleId: g.sub } });
  if (!user) {
    const byEmail = await db.user.findUnique({ where: { email: g.email } });
    if (byEmail) {
      if (byEmail.role === "ADMIN") return fail("admin_password"); // admins sign in with a password only
      if (byEmail.googleId && byEmail.googleId !== g.sub) return fail("google_failed");
      // Google has proven this email. A password someone set earlier without proof of the email is dropped, so it cannot be used to hijack the account.
      const dropUnverifiedPassword = !byEmail.emailVerified && Boolean(byEmail.passwordHash);
      user = await db.user.update({
        where: { id: byEmail.id },
        data: { googleId: g.sub, emailVerified: true, ...(dropUnverifiedPassword ? { passwordHash: null, tokenVersion: { increment: 1 } } : {}) },
      });
    } else {
      user = await db.user.create({ data: { email: g.email, name: g.name || g.email.split("@")[0], googleId: g.sub, emailVerified: true } });
    }
  }
  if (user.role === "ADMIN") return fail("admin_password");
  await createSession(user);
  const res = NextResponse.redirect(siteUrl(safeNext(saved.next, "/account")));
  res.cookies.delete({ name: GOOGLE_COOKIE, path: "/api/auth/google" });
  return res;
}
