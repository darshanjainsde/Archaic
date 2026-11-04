import { z } from "zod";

export const passwordRule = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Password is too long")
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Include at least one letter and one number");
