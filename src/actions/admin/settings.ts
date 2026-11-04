"use server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS, settingsSchema, type StoreSettings } from "@/lib/settings-schema";
import { firstError, zodFieldErrors, type ActionResult } from "@/lib/admin-types";

type Key = keyof StoreSettings;
const KEYS = Object.keys(DEFAULT_SETTINGS) as Key[];

/** Replace one or more top-level parts of the settings, validating the whole object before saving. */
export async function saveSettingsParts(parts: Partial<StoreSettings>): Promise<ActionResult> {
  await assertAdmin();
  const current = await getSettings();
  const next = { ...current } as Record<string, unknown>;
  for (const k of Object.keys(parts) as Key[]) {
    if (!KEYS.includes(k)) return { ok: false, error: `Unknown settings area ${String(k)}` };
    next[k] = parts[k];
  }
  const parsed = settingsSchema.safeParse(next);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error.issues), fieldErrors: zodFieldErrors(parsed.error.issues) };
  const s = parsed.data;
  // business rules zod can't express
  const tiers = [...s.membership.tiers].sort((a, b) => a.minSpend - b.minSpend);
  if (tiers[0].minSpend !== 0) return { ok: false, error: "The first membership tier must start at ₹0" };
  if (new Set(tiers.map((t) => t.minSpend)).size !== tiers.length) return { ok: false, error: "Two membership tiers cannot have the same minimum spend" };
  s.membership.tiers = tiers;
  if (s.commerce.deliveryDaysMax < s.commerce.deliveryDaysMin) return { ok: false, error: "Maximum delivery days must be at least the minimum" };
  const ids = s.home.sections.map((x) => x.id);
  if (new Set(ids).size !== ids.length) return { ok: false, error: "Two homepage sections share an id" };
  await saveSettings(s);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. Your store is updated." };
}

export async function resetSettingsPart(key: Key): Promise<ActionResult> {
  await assertAdmin();
  if (!KEYS.includes(key)) return { ok: false, error: "Unknown settings area" };
  return saveSettingsParts({ [key]: structuredClone(DEFAULT_SETTINGS[key]) } as Partial<StoreSettings>);
}
