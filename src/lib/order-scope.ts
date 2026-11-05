import type { Prisma } from "@prisma/client";

/**
 * Which orders an account may see. Orders placed as a guest (no sign-in) are only handed to an account once its email
 * is verified, so nobody can sign up with someone else's email and read that person's guest orders.
 */
export function ownedOrders(user: { id: string; emailVerified: boolean }): Prisma.OrderWhereInput {
  return user.emailVerified ? { userId: user.id } : { userId: user.id, isGuest: false };
}
export const canSeeOrder = (user: { id: string; emailVerified: boolean }, o: { userId: string; isGuest: boolean }) =>
  o.userId === user.id && (user.emailVerified || !o.isGuest);
