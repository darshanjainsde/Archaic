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
  if (exists) return { fieldErrors: { email: "An account with this email already exists. Sign in instead." }, values };
  const user = await db.user.create({ data: { name, email, phone: phone || null, passwordHash: await hashPassword(password), marketingOptIn: marketing } });
  if (marketing) await db.subscriber.upsert({ where: { email }, create: { email }, update: {} }).catch(() => {});
  await createSession(user);
  redirect(safeNext(str(fd, "next"), "/account"));
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const values = { email: str(fd, "email") };
  const email = values.email.trim().toLowerCase();
  const password = str(fd, "password");
  if (!email || !password) return { error: "Enter your email and password", values };
  const ip = await clientIp();
  const a = rateLimit(`login:${email}`, 8, 15 * 60_000);
  const b = rateLimit(`login-ip:${ip}`, 30, 15 * 60_000);
  if (!a.ok || !b.ok) return { error: `Too many attempts. Try again in ${Math.ceil(Math.max(a.retryAfter, b.retryAfter) / 60)} minutes.`, values };
  const user = await db.user.findUnique({ where: { email } });
  // Always run bcrypt to keep timing similar
  const ok = await verifyPassword(password, user?.passwordHash ?? "$2a$11$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!user || !ok) return { error: "That email and password do not match", values };
  await createSession(user);
  const fallback = user.role === "ADMIN" ? "/admin" : "/account";
  redirect(safeNext(str(fd, "next"), fallback));
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
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  await db.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 3600_000) } });
  const link = siteUrl(`/reset-password?token=${token}`);
  if (process.env.NODE_ENV !== "production") console.info(`[auth] password reset link for ${email}: ${link}`);
  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    html: emailLayout("Reset your password", `<p>Hi ${escapeHtml(user.name.split(" ")[0])}, use the link below to choose a new password. It expires in one hour.</p><p><a href="${link}" style="color:#2b2216;font-weight:bold">Choose a new password</a></p><p>If you did not ask for this, you can ignore this email.</p>`),
    text: `Reset your password: ${link}`,
  });
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
    return tx.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(pw.data), tokenVersion: { increment: 1 } } });
  });
  if (!user) return { error: "This reset link was already used. Request a new one." };
  await createSession(user);
  redirect("/account?reset=1");
}

export async function redirectIfSignedIn(next?: string) {
  const u = await getCurrentUser();
  if (u) redirect(safeNext(next, u.role === "ADMIN" ? "/admin" : "/account"));
}
