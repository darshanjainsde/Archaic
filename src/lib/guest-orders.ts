import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { key } from "./session-token";

/**
 * Guests (no account) get access to the orders they placed in THIS browser through a signed cookie.
 * Typing someone else's email at checkout never gives access to that person's account or other orders.
 */
const COOKIE = "ac_orders";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days
const MAX_ORDERS = 20;

export async function guestOrderNumbers(): Promise<string[]> {
  try {
    const raw = (await cookies()).get(COOKIE)?.value;
    if (!raw) return [];
    const { payload } = await jwtVerify(raw, key(), { algorithms: ["HS256"] });
    return Array.isArray(payload.o) ? (payload.o as unknown[]).map(String).slice(0, MAX_ORDERS) : [];
  } catch {
    return [];
  }
}

/** Call from a server action or route handler right after a guest places an order. */
export async function rememberGuestOrder(number: string) {
  const list = [number, ...(await guestOrderNumbers()).filter((n) => n !== number)].slice(0, MAX_ORDERS);
  const token = await new SignJWT({ o: list }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key());
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

/** Signed-in owner, or the browser that placed the order as a guest. */
export async function canAccessOrder(order: { userId: string; number: string }, user: { id: string } | null): Promise<boolean> {
  if (user && order.userId === user.id) return true;
  return (await guestOrderNumbers()).includes(order.number);
}
