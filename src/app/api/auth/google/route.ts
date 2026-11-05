import { NextResponse } from "next/server";
import { googleEnabled, googleRedirectUri, newPkce, signOauthState, GOOGLE_COOKIE } from "@/lib/google-oauth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { safeNext, siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Starts "Continue with Google": PKCE + state, then redirect to Google. */
export async function GET(req: Request) {
  if (!googleEnabled()) return NextResponse.redirect(siteUrl("/login?error=google_off"));
  if (!rateLimit(`google-start:${await clientIp()}`, 30, 600_000).ok) return NextResponse.redirect(siteUrl("/login?error=google_failed"));
  const next = safeNext(new URL(req.url).searchParams.get("next"), "/account");
  const { verifier, challenge, state } = newPkce();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: googleRedirectUri(), response_type: "code",
    scope: "openid email profile", state, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set(GOOGLE_COOKIE, await signOauthState({ state, verifier, next }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google", maxAge: 600 });
  return res;
}
