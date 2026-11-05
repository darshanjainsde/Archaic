import "server-only";
import crypto from "node:crypto";
import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { key } from "./session-token";
import { siteUrl } from "./utils";

export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const GOOGLE_COOKIE = "ac_oauth";
export const googleRedirectUri = () => siteUrl("/api/auth/google/callback");

const b64url = (b: Buffer) => b.toString("base64url");
export function newPkce() {
  const verifier = b64url(crypto.randomBytes(48));
  return { verifier, challenge: b64url(crypto.createHash("sha256").update(verifier).digest()), state: b64url(crypto.randomBytes(24)) };
}

export const signOauthState = (p: { state: string; verifier: string; next: string }) =>
  new SignJWT(p).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(key());
export async function readOauthState(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return { state: String(payload.state), verifier: String(payload.verifier), next: String(payload.next ?? "") };
  } catch {
    return null;
  }
}

const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

/** Exchanges the code and returns the verified Google identity, or null. Requires a verified email. */
export async function exchangeGoogleCode(code: string, verifier: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(), grant_type: "authorization_code", code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) return null;
  try {
    const { payload } = await jwtVerify(id_token, jwks, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience: process.env.GOOGLE_CLIENT_ID });
    if (!payload.sub || typeof payload.email !== "string" || payload.email_verified !== true) return null;
    return { sub: String(payload.sub), email: payload.email.trim().toLowerCase(), name: typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : "" };
  } catch {
    return null;
  }
}
