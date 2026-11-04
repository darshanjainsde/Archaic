import { z } from "zod";
import { INDIAN_STATES } from "./utils";

/** Shared address validation (client + server). */
export const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name").max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")),
  line1: z.string().trim().min(3, "Enter house / flat and street").max(160),
  line2: z.string().trim().max(160).optional().nullable().transform((v) => v || null),
  landmark: z.string().trim().max(100).optional().nullable().transform((v) => v || null),
  city: z.string().trim().min(2, "Enter the city").max(60),
  state: z.string().refine((v) => INDIAN_STATES.includes(v), "Choose a state"),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  country: z.string().default("India"),
});
export type AddressInput = z.input<typeof addressSchema>;
export type AddressData = z.output<typeof addressSchema>;

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = issue.path.join(".");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}
