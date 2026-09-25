import { z } from "zod";
import {
  GENDERS,
  HINT_TYPES,
  PUBLIC_CASE_STATUSES,
  REPORT_REASONS,
  SOURCE_TYPES,
} from "../enums";
import { FEDERAL_STATE_CODES } from "../federal-states";
import { looksLikeStreetAddress } from "../text";
import {
  boolish,
  honeypot,
  optInt,
  optNumber,
  optPastDate,
  optText,
  optUrl,
  pagination,
  pastDate,
  reqText,
  timeHHMM,
} from "./common";

const consent = boolish.refine((v) => v === true, "Bitte bestätigen Sie die Datenschutzhinweise");

const noAddress = (label: string) => (v: string | null | undefined) =>
  !v || !looksLikeStreetAddress(v) || `${label}: Bitte keine genaue Adresse (Straße + Hausnummer) angeben`;

// ───────────────────────── Neue Vermisstenmeldung ─────────────────────────

export const submissionSchema = z
  .object({
    personName: reqText(120, 2),
    age: optInt(0, 120),
    gender: z.enum(GENDERS).default("UNKNOWN"),
    missingSince: pastDate,
    missingPlace: reqText(160, 2),
    description: optText(3000),
    circumstances: optText(5000),
    sourceText: reqText(500, 3),
    sourceUrl: optUrl,
    contact: optText(300),
    consent,
    website: honeypot,
  })
  .superRefine((val, ctx) => {
    const msg = noAddress("Vermisstenort")(val.missingPlace);
    if (msg !== true) ctx.addIssue({ code: "custom", path: ["missingPlace"], message: msg });
  });
export type SubmissionInput = z.infer<typeof submissionSchema>;

// ───────────────────────────── Hinweise ─────────────────────────────

export const hintSchema = z
  .object({
    hintType: z.enum(HINT_TYPES),
    observedDate: optPastDate,
    observedTime: timeHHMM,
    locationText: optText(300),
    latitude: optNumber(-90, 90),
    longitude: optNumber(-180, 180),
    description: reqText(5000, 10),
    isAnonymous: boolish.default(true),
    contact: optText(300),
    consent,
    website: honeypot,
  })
  .superRefine((val, ctx) => {
    if ((val.latitude === undefined) !== (val.longitude === undefined)) {
      ctx.addIssue({ code: "custom", path: ["latitude"], message: "Breite und Länge nur gemeinsam angeben" });
    }
    if (!val.isAnonymous && !val.contact) {
      ctx.addIssue({
        code: "custom",
        path: ["contact"],
        message: "Für nicht-anonyme Hinweise bitte eine Kontaktmöglichkeit angeben",
      });
    }
  });
export type HintInput = z.infer<typeof hintSchema>;

// ─────────────────────────── Inhalt melden ───────────────────────────

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  message: reqText(3000, 5),
  contact: optText(300),
  website: honeypot,
});
export type ReportInput = z.infer<typeof reportSchema>;

// ─────────────────────────── Suche & Filter ───────────────────────────

const multi = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => {
    if (v == null || v === "") return undefined;
    const arr = Array.isArray(v) ? v : String(v).split(",");
    return arr.map((s) => String(s).trim()).filter(Boolean);
  }, z.array(z.enum(values)).max(values.length).optional());

const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);

export const caseFilterSchema = z.object({
  q: z.preprocess(emptyToUndef, z.string().trim().max(200).optional()),
  status: multi(PUBLIC_CASE_STATUSES),
  gender: multi(GENDERS),
  ageMin: optInt(0, 130),
  ageMax: optInt(0, 130),
  state: z.preprocess(emptyToUndef, z.enum(FEDERAL_STATE_CODES).optional()),
  city: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
  since: optPastDate,
  until: z.preprocess(emptyToUndef, z.coerce.date().optional()),
  sourceType: z.preprocess(emptyToUndef, z.enum(SOURCE_TYPES).optional()),
  urgent: z.preprocess((v) => (v === "true" || v === "1" ? true : undefined), z.boolean().optional()),
});
export type CaseFilter = z.infer<typeof caseFilterSchema>;

export const caseListQuerySchema = caseFilterSchema.extend(pagination.shape);
export type CaseListQuery = z.infer<typeof caseListQuerySchema>;

// ─────────────────────────── Authentifizierung ───────────────────────────

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Ungültige E-Mail-Adresse")),
  password: z.string().min(1, "Pflichtfeld").max(200),
});

export const passwordSchema = z
  .string()
  .min(10, "Mindestens 10 Zeichen")
  .max(200, "Maximal 200 Zeichen");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Ungültige E-Mail-Adresse")),
  displayName: reqText(60, 2),
  password: passwordSchema,
  website: honeypot,
});

/** Wandelt URLSearchParams / FormData in ein Objekt (Mehrfachwerte → Array). */
export function formEntriesToObject(entries: Iterable<[string, FormDataEntryValue | string]>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (typeof value !== "string") continue; // Dateien werden separat behandelt
    const existing = out[key];
    if (existing === undefined) out[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else out[key] = [existing, value];
  }
  return out;
}
