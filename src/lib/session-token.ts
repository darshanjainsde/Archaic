import { SignJWT, jwtVerify } from "jose";

/** Edge-safe JWT helpers (used by proxy.ts and auth.ts). */
export const SESSION_COOKIE = "ac_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = { sub: string; role: "CUSTOMER" | "ADMIN"; v: number };

export function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (32+ chars)");
    return new TextEncoder().encode("insecure-development-secret-insecure-development-secret");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(p: SessionPayload) {
  return new SignJWT({ role: p.role, v: p.v })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { sub: payload.sub, role: payload.role === "ADMIN" ? "ADMIN" : "CUSTOMER", v: Number(payload.v) || 0 };
  } catch {
    return null;
  }
}
