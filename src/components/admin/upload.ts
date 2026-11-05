"use client";

const SERVER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const MAX_EDGE = 2400;
const SHRINK_ABOVE = 1.5 * 1024 * 1024;

/**
 * Phone photos are often 4–12 MB (or HEIC on iPhones). Re-encode large or unsupported images to a
 * JPEG no wider/taller than 2400 px so they fit the 5 MB upload limit. GIFs and small files pass through.
 */
async function prepare(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  if (SERVER_TYPES.includes(file.type) && file.size <= SHRINK_ABOVE) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    if (file.type === "image/png") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // the browser could not decode it; let the server explain
  }
}

/** Uploads files to /api/upload with progress (0–100). Resolves to the stored URLs. */
export async function uploadFiles(files: File[], onProgress?: (pct: number) => void): Promise<string[]> {
  onProgress?.(0);
  const ready = await Promise.all(files.map(prepare));
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    ready.forEach((f) => fd.append("files", f));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    xhr.onload = () => {
      let data: { urls?: string[]; error?: string } = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.urls) { onProgress?.(100); resolve(data.urls); }
      else reject(new Error(data.error || `Upload failed (${xhr.status}). Try a JPG or PNG under 5 MB.`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload. Check your connection and try again."));
    xhr.send(fd);
  });
}
