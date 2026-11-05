"use server";
import crypto from "node:crypto";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword, getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email";
import { safeNext, siteUrl } from "@/lib/utils";
import { fieldErrors } from "@/lib/address";
import { passwordRule } from "@/lib/password-rule";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean; message?: string; values?: Record<string, string> } | undefined;

const emailField = z.string().trim().toLowerCase().max(160).pipe(z.email("Enter a valid email address"));
const phoneField = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .refine((v) => v === "" || /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number");

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const normPhone = (v: string) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");

/** Emails a one-hour link that lets the owner of this email choose a password. Opening it also proves the email (so guest orders and Google link up safely). */
async function sendSetPasswordLink(user: { id: string; email: string; name: string }, kind: "reset" | "claim") {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  await db.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 3600_000) } });
  const link = siteUrl(`/reset-password?token=${token}`);
  if (process.env.NODE_ENV !== "production") console.info(`[auth] ${kind} link for ${user.email}: ${link}`);
  const first = escapeHtml(user.name.split(" ")[0]);
  const claim = kind === "claim";
  await sendEmail({
    to: user.email,
    subject: claim ? "Finish setting up your Archaic Candles account" : "Reset your password",
    html: emailLayout(claim ? "Finish setting up your account" : "Reset your password", `<p>Hi ${first}, ${claim ? "we found orders placed with this email. Choose a password to open your account and see them all." : "use the link below to choose a new password."} The link is valid for one hour.</p><p><a href="${link}" style="display:inline-block;background:#2b2216;color:#efe7d8;padding:12px 22px;text-decoration:none">${claim ? "Set my password" : "Choose a new password"}</a></p>`),
    text: `${claim ? "Set your password" : "Reset your password"}: ${link}`,
  });
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const values = { name: str(fd, "name"), email: str(fd, "email"), phone: str(fd, "phone") };
  const parsed = z
    .object({ name: z.string().trim().min(2, "Enter your name").max(80), email: emailField, phone: phoneField, password: passwordRule, marketing: z.boolean() })
    .safeParse({ ...values, password: str(fd, "password"), marketing: fd.get("marketing") === "on" });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 10, 3600_000).ok) return { error: "Too many sign-ups from this network. Try again later.", values };
  const { name, email, phone, password, marketing } = parsed.data;
  const exists = await db.user.findUnique({ where: { email } });
  if (exists?.passwordHash) return { fieldErrors: { email: "An account with this email already exists. Sign in instead." }, values };
  if (exists) {
    // Email already known without a password: orders placed as a guest, or a Google sign-in. Never hand that over on a typed email alone.
    if (exists.googleId) return { fieldErrors: { email: "This email is already registered with Google. Use “Continue with Google” to sign in." }, values };
    if (!rateLimit(`claim:${email}`, 3, 3600_000).ok) return { error: "We already emailed you a link. Please check your inbox, or try again in an hour.", values };
    await sendSetPasswordLink(exists, "claim");
    return { ok: true, message: "We found orders placed with this email. For your security we have emailed you a link to set your password. Open it to see all your orders.", values };
  }
  if (phone && (await db.user.findUnique({ where: { phone }, select: { id: true } }))) return { fieldErrors: { phone: "This mobile number is already used by another account." }, values };
  const user = await db.user.create({ data: { name, email, phone: phone || null, passwordHash: await hashPassword(password), marketingOptIn: marketing } });
  if (marketing) await db.subscriber.upsert({ where: { email }, create: { email }, update: {} }).catch(() => {});
  await createSession(user);
  redirect(safeNext(str(fd, "next"), "/account"));
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const raw = str(fd, "email").trim();
  const values = { email: raw };
  const password = str(fd, "password");
  if (!raw || !password) return { error: "Enter your email or mobile number and your password", values };
  const email = raw.toLowerCase();
  const phone = normPhone(raw);
  const where = raw.includes("@") ? { email } : /^[6-9]\d{9}$/.test(phone) ? { phone } : null;
  const ip = await clientIp();
  const a = rateLimit(`login:${where ? ("email" in where ? where.email : where.phone) : raw.slice(0, 40)}`, 8, 15 * 60_000);
  const b = rateLimit(`login-ip:${ip}`, 30, 15 * 60_000);
  if (!a.ok || !b.ok) return { error: `Too many attempts. Try again in ${Math.ceil(Math.max(a.retryAfter, b.retryAfter) / 60)} minutes.`, values };
  const user = where ? await db.user.findUnique({ where }) : null;
  // Always run bcrypt to keep timing similar
  const ok = await verifyPassword(password, user?.passwordHash ?? "$2a$11$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!user || !user.passwordHash || !ok) return { error: "That email or mobile number and password do not match. If you signed up with Google, use “Continue with Google”.", values };
  await createSession(user);
  const fallback = user.role === "ADMIN" ? "/admin" : "/account";
  redirect(safeNext(str(fd, "next"), fallback));
}

/** Emails a link that proves the signed-in user owns their email (unlocks orders placed as a guest with it). */
export async function sendVerificationEmail(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.emailVerified) redirect("/account");
  if (rateLimit(`verify:${user.id}`, 3, 3600_000).ok) {
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 24 * 3600_000) } });
    const link = siteUrl(`/api/auth/verify?token=${token}`);
    if (process.env.NODE_ENV !== "production") console.info(`[auth] verify link for ${user.email}: ${link}`);
    await sendEmail({
      to: user.email,
      subject: "Confirm your email",
      html: emailLayout("Confirm your email", `<p>Hi ${escapeHtml(user.name.split(" ")[0])}, confirm this email to see every order placed with it.</p><p><a href="${link}" style="display:inline-block;background:#2b2216;color:#efe7d8;padding:12px 22px;text-decoration:none">Confirm my email</a></p>`),
      text: `Confirm your email: ${link}`,
    });
  }
  redirect("/account?verify=sent");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").trim().toLowerCase();
  const generic: FormState = { ok: true, message: "If an account exists for that email, we have sent a link to reset the password. It is valid for one hour." };
  if (!z.email().safeParse(email).success) return { fieldErrors: { email: "Enter a valid email address" }, values: { email } };
  const ip = await clientIp();
  if (!rateLimit(`reset:${email}`, 3, 3600_000).ok || !rateLimit(`reset-ip:${ip}`, 10, 3600_000).ok) return generic;
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return generic;
  await sendSetPasswordLink(user, user.passwordHash ? "reset" : "claim");
  return generic;
}

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, "token");
  const pw = passwordRule.safeParse(str(fd, "password"));
  if (!pw.success) return { fieldErrors: { password: pw.error.issues[0].message } };
  if (str(fd, "password") !== str(fd, "confirm")) return { fieldErrors: { confirm: "Passwords do not match" } };
  if (!token) return { error: "This reset link is invalid. Request a new one." };
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const rec = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return { error: "This reset link has expired or was already used. Request a new one." };
  const user = await db.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({ where: { id: rec.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count === 0) return null;
    return tx.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(pw.data), emailVerified: true, tokenVersion: { increment: 1 } } });
  });
  if (!user) return { error: "This reset link was already used. Request a new one." };
  await createSession(user);
  redirect("/account?reset=1");
}

export async function redirectIfSignedIn(next?: string) {
  const u = await getCurrentUser();
  if (u) redirect(safeNext(next, u.role === "ADMIN" ? "/admin" : "/account"));
}
