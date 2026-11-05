import "server-only";
import { cache } from "react";
import { unstable_cache, updateTag } from "next/cache";
import { db } from "./db";
import { parseSettings, type StoreSettings } from "./settings-schema";

export const SETTINGS_TAG = "store-settings";

async function readSettingsRow() {
  const row = await db.setting.findUnique({ where: { id: "store" } });
  return (row?.data ?? null) as unknown;
}

/** Settings row cached across requests (served from Vercel's data cache, not the database). Cleared by saveSettings. */
const readCached = unstable_cache(readSettingsRow, ["store-settings-v1"], { tags: [SETTINGS_TAG], revalidate: 3600 });

/** Store settings, cached per request and across requests. Falls back to defaults if the DB row does not exist yet. */
export const getSettings = cache(async (): Promise<StoreSettings> => {
  try {
    return parseSettings(await readCached());
  } catch (err) {
    console.error("[settings] failed to load, using defaults", err);
    return parseSettings(null);
  }
});

/** Uncached read — use before modifying settings so edits never build on a stale copy. */
export async function getSettingsFresh(): Promise<StoreSettings> {
  return parseSettings(await readSettingsRow());
}

export async function saveSettings(next: StoreSettings) {
  await db.setting.upsert({
    where: { id: "store" },
    create: { id: "store", data: next as object },
    update: { data: next as object },
  });
  updateTag(SETTINGS_TAG);
}

export function gatewayConfig() {
  return {
    razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    razorpayWebhook: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    cashfree: Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY),
    cashfreeEnv: process.env.CASHFREE_ENV === "sandbox" ? "sandbox" : "production",
    blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    email: Boolean(process.env.RESEND_API_KEY),
  } as const;
}

/** Payment methods actually usable right now (enabled in admin AND keys configured). */
export function availablePaymentMethods(s: StoreSettings) {
  const g = gatewayConfig();
  const methods: ("RAZORPAY" | "CASHFREE" | "COD")[] = [];
  const online: ("RAZORPAY" | "CASHFREE")[] = [];
  if (s.commerce.cashfreeEnabled && g.cashfree) online.push("CASHFREE");
  if (s.commerce.razorpayEnabled && g.razorpay) online.push("RAZORPAY");
  if (s.commerce.preferredGateway === "razorpay") online.sort((a) => (a === "RAZORPAY" ? -1 : 1));
  methods.push(...online);
  if (s.commerce.codEnabled) methods.push("COD");
  return methods;
}
