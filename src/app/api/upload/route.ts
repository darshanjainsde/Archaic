import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 10;

/** Sniff magic bytes so a renamed file can't pretend to be an image. */
function sniff(buf: Uint8Array): string | null {
  const b = (i: number) => buf[i];
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46) return "image/gif";
  const str = (s: number, e: number) => String.fromCharCode(...buf.slice(s, e));
  if (str(0, 4) === "RIFF" && str(8, 12) === "WEBP") return "image/webp";
  if (str(4, 8) === "ftyp" && /avif|avis/.test(str(8, 12))) return "image/avif";
  return null;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return NextResponse.json({ error: "No files received" }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json({ error: `Upload at most ${MAX_FILES} files at a time` }, { status: 400 });

  const urls: string[] = [];
  const year = new Date().getFullYear();
  for (const file of files) {
    if (file.size > MAX_BYTES) return NextResponse.json({ error: `${file.name} is larger than 5 MB` }, { status: 400 });
    const buf = new Uint8Array(await file.arrayBuffer());
    const type = sniff(buf);
    if (!type || !TYPES[type]) return NextResponse.json({ error: `${file.name} is not a JPG, PNG, WebP, AVIF or GIF image` }, { status: 400 });
    const name = `${uid()}.${TYPES[type]}`;
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`uploads/${year}/${name}`, Buffer.from(buf), { access: "public", contentType: type, addRandomSuffix: false });
        urls.push(blob.url);
      } else {
        if (process.env.VERCEL) return NextResponse.json({ error: "Image storage is not configured. Add BLOB_READ_WRITE_TOKEN in Vercel." }, { status: 500 });
        const dir = path.join(process.cwd(), "public", "uploads", String(year));
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, name), buf);
        urls.push(`/uploads/${year}/${name}`);
      }
    } catch (err) {
      console.error("[upload] failed", err);
      return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }
  }
  return NextResponse.json({ urls });
}
