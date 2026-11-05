import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session-token";

/** Non-secret, browser-readable "signed in as customer (u) / admin (a)" hint for cached pages. */
export const HINT_COOKIE = "ac_hint";

export type SessionUser = { id: string; email: string; name: string; phone: string | null; role: "CUSTOMER" | "ADMIN"; emailVerified: boolean; hasPassword: boolean };

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 11);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(user: { id: string; role: "CUSTOMER" | "ADMIN"; tokenVersion: number }) {
  const token = await signSession({ sub: user.id, role: user.role, v: user.tokenVersion });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  // Readable by the browser so cached (static) pages can show "My account" and Admin without a server round trip.
  // It only changes what the header shows; every protected page and action still checks the signed session.
  jar.set(HINT_COOKIE, user.role === "ADMIN" ? "a" : "u", { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(HINT_COOKIE);
}

/** Current user (verified against DB so role changes / password resets take effect immediately). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const payload = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, phone: true, role: true, tokenVersion: true, emailVerified: true, passwordHash: true },
  });
  if (!user || user.tokenVersion !== payload.v) return null;
  return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, emailVerified: user.emailVerified, hasPassword: Boolean(user.passwordHash) };
});

export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** For server actions: throws instead of redirecting. */
export async function assertAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Not authorised");
  return user;
}
