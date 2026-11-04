import "server-only";
import { escapeHtml } from "./escape";

/** Sends transactional email through Resend if RESEND_API_KEY is set; otherwise logs (never throws). */
export async function sendEmail(opts: { to: string; subject: string; html: string; text?: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Archaic Candles <onboarding@resend.dev>";
  if (!key) {
    console.info(`[email:dev] to=${opts.to} subject="${opts.subject}"\n${opts.text ?? opts.html.replace(/<[^>]+>/g, " ").slice(0, 600)}`);
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
    });
    if (!res.ok) console.error("[email] resend error", res.status, await res.text());
    return { ok: res.ok };
  } catch (err) {
    console.error("[email] failed", err);
    return { ok: false };
  }
}

export { escapeHtml };

/** Simple branded wrapper for all emails. */
export function emailLayout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#efe7d8;font-family:Georgia,serif;color:#2b2216">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="font-size:22px;letter-spacing:-0.02em;margin-bottom:24px">Archaic Candles</div>
    <div style="background:#fffaf1;padding:28px">
      <h1 style="font-size:24px;font-weight:500;margin:0 0 16px">${escapeHtml(title)}</h1>
      <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${bodyHtml}</div>
    </div>
    <p style="font-family:Arial,sans-serif;font-size:12px;color:#6b5d4c;margin-top:20px">You are receiving this because you have an account or order with Archaic Candles.</p>
  </div></body></html>`;
}
