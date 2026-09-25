import { z } from "zod";
import { isHttpUrl, normalizeText } from "../text";

/** Pflicht-Freitext, normalisiert, mit Längengrenzen */
export const reqText = (max: number, min = 1) =>
  z
    .string({ error: "Pflichtfeld" })
    .transform(normalizeText)
    .pipe(z.string().min(min, min === 1 ? "Pflichtfeld" : `Mindestens ${min} Zeichen`).max(max, `Maximal ${max} Zeichen`));

/** Optionaler Freitext: leere Strings → null */
export const optText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((v) => (v == null ? v : normalizeText(v)))
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().max(max, `Maximal ${max} Zeichen`).nullish());

/** Nur http(s)-URLs (verhindert javascript:/data:-Links) */
export const optUrl = z
  .string()
  .nullish()
  .transform((v) => (v == null ? v : v.trim()))
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v == null || (v.length <= 2000 && isHttpUrl(v)), "Nur http(s)-Links erlaubt")
  .optional();

/** Leere Formularwerte → undefined; sonst Zahl */
const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

export const optInt = (min: number, max: number) =>
  z.preprocess(emptyToUndef, z.coerce.number().int("Ganze Zahl erwartet").min(min).max(max).optional());

export const optNumber = (min: number, max: number) =>
  z.preprocess(emptyToUndef, z.coerce.number().min(min).max(max).optional());

/** Datum (YYYY-MM-DD oder ISO) → Date; nicht in der Zukunft */
export const pastDate = z.preprocess(
  emptyToUndef,
  z.coerce
    .date({ error: "Ungültiges Datum" })
    .refine((d) => d.getTime() <= Date.now() + 24 * 3600 * 1000, "Datum liegt in der Zukunft")
    .refine((d) => d.getUTCFullYear() >= 1900, "Ungültiges Datum"),
);

export const optPastDate = z.preprocess(emptyToUndef, pastDate.optional());

/** Checkbox-/Formularwerte */
export const boolish = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "on" || v === "1") return true;
  if (v === "false" || v === "off" || v === "0" || v === "" || v == null) return false;
  return v;
}, z.boolean());

export const uuid = z.uuid("Ungültige ID");

export const pagination = z.object({
  page: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(10_000).default(1)),
  pageSize: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(50).default(20)),
});

/** Honeypot: muss leer sein */
export const honeypot = z
  .string()
  .nullish()
  .refine((v) => !v, "Ungültige Eingabe");

export const timeHHMM = z.preprocess(
  emptyToUndef,
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit im Format HH:MM")
    .optional(),
);
