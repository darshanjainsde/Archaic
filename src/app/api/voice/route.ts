import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessOrder } from "@/lib/guest-orders";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import type { BoxSnapshot } from "@/lib/box/core";

export const runtime = "nodejs";
const MAX_BYTES = 8 * 1024 * 1024;

/** Recognise common audio containers by their first bytes, so a renamed file can't pass as audio. */
function sniff(b: Uint8Array): { type: string; ext: string } | null {
  const s = (a: number, z: number) => String.fromCharCode(...b.slice(a, z));
  if (s(0, 4) === "OggS") return { type: "audio/ogg", ext: "ogg" };
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { type: "audio/webm", ext: "webm" };
  if (s(0, 4) === "RIFF" && s(8, 12) === "WAVE") return { type: "audio/wav", ext: "wav" };
  if (s(4, 8) === "ftyp") return { type: "audio/mp4", ext: "m4a" };
  if (s(0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { type: "audio/mpeg", ext: "mp3" };
  if (s(0, 4) === "#!AM") return { type: "audio/amr", ext: "amr" };
  return null;
}

export async function POST(req: Request) {
  const rl = rateLimit(`voice:${await clientIp()}`, 12, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many uploads. Try again in a few minutes." }, { status: 429 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Invalid upload" }, { status: 400 }); }
  const number = String(form.get("number") ?? "").trim().toUpperCase().slice(0, 20);
  const itemId = String(form.get("item") ?? "").slice(0, 40);
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a recording first" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Keep the recording under 8 MB (about 3 minutes)" }, { status: 400 });

  const order = await db.order.findUnique({ where: { number }, select: { id: true, number: true, userId: true, status: true } });
  const user = await getCurrentUser();
  if (!order || !(user?.role === "ADMIN" || (await canAccessOrder(order, user)))) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (["CANCELLED", "REFUNDED", "RETURNED", "DELIVERED", "SHIPPED", "OUT_FOR_DELIVERY"].includes(order.status) && user?.role !== "ADMIN")
    return NextResponse.json({ error: "This box has already been packed, so the voice note can no longer change" }, { status: 400 });
  const item = await db.orderItem.findFirst({ where: { id: itemId, orderId: order.id } });
  const box = item?.box as BoxSnapshot | null;
  if (!item || !box?.card.voice || !box.voice?.token) return NextResponse.json({ error: "This box has no voice note" }, { status: 400 });

  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) return NextResponse.json({ error: "That file isn’t a recording we can play. Use MP3, M4A, WAV, OGG or WebM." }, { status: 400 });
  const name = `${box.voice.token}-${Date.now().toString(36)}.${kind.ext}`;
  let url: string;
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      url = (await put(`voice/${name}`, Buffer.from(buf), { access: "public", contentType: kind.type, addRandomSuffix: true })).url;
    } else {
      if (process.env.VERCEL) return NextResponse.json({ error: "Storage is not configured" }, { status: 500 });
      const dir = path.join(process.cwd(), "public", "uploads", "voice");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, name), buf);
      url = `/uploads/voice/${name}`;
    }
  } catch (err) {
    console.error("[voice] upload failed", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
  const next = { ...box, voice: { ...box.voice, url, uploadedAt: new Date().toISOString() } };
  await db.orderItem.update({ where: { id: item.id }, data: { box: next as unknown as Prisma.InputJsonValue } });
  return NextResponse.json({ ok: true, url });
}
