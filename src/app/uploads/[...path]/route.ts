import { readFile } from "node:fs/promises";
import path from "node:path";

/** Serves images uploaded to local disk (dev / self-hosted fallback when Vercel Blob is not configured). */
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif" };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  if (!parts?.length || parts.some((p) => !/^[a-zA-Z0-9._-]+$/.test(p) || p.startsWith("."))) return new Response("Not found", { status: 404 });
  const root = path.join(process.cwd(), "public", "uploads");
  const file = path.join(root, ...parts);
  if (!file.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(file);
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
