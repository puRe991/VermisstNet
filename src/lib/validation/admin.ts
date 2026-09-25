import { z } from "zod";
import {
  CASE_STATUSES,
  COPYRIGHT_STATUSES,
  DECISIONS,
  GENDERS,
  LOCATION_TYPES,
  MEDIA_TYPES,
  PRIVACY_LEVELS,
  PUBLICATION_STATUSES,
  REVIEW_STATUSES,
  ROLES,
  SOURCE_TYPES,
  TIMELINE_EVENT_TYPES,
  VISIBILITIES,
  HINT_STATUSES,
  SUBMISSION_STATUSES,
  REPORT_STATUSES,
} from "../enums";
import { FEDERAL_STATE_CODES } from "../federal-states";
import { looksLikeStreetAddress } from "../text";
import { boolish, optPastDate, optText, optUrl, pagination, pastDate, reqText, uuid } from "./common";
import { passwordSchema } from "./public";

const emptyToNull = (v: unknown) => (v === "" ? null : v);
const optState = z.preprocess(emptyToNull, z.enum(FEDERAL_STATE_CODES).nullish());
const optUuid = z.preprocess(emptyToNull, uuid.nullish());
/** Ganzzahl, die per "" oder null geleert werden kann */
const nullableInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null ? null : v), z.coerce.number().int().min(min).max(max).nullable());

const placeText = (max: number) =>
  reqText(max, 2).refine((v) => !looksLikeStreetAddress(v), "Keine Adresse mit Hausnummer angeben (Datenminimierung)");
const optPlaceText = (max: number) =>
  optText(max).refine((v) => !v || !looksLikeStreetAddress(v), "Keine Adresse mit Hausnummer angeben (Datenminimierung)");

// ───────────────────────────── Person ─────────────────────────────

export const personFields = {
  firstName: reqText(80),
  lastName: optText(80),
  birthDate: z.preprocess(emptyToNull, pastDate.nullish()),
  ageAtMissing: nullableInt(0, 130).optional(),
  gender: z.enum(GENDERS),
  heightCm: nullableInt(30, 260).optional(),
  build: optText(80),
  hairColor: optText(80),
  eyeColor: optText(80),
  distinguishingFeatures: optText(2000),
  description: optText(5000),
  privacyLevel: z.enum(PRIVACY_LEVELS),
};

// ───────────────────────────── Fall ─────────────────────────────

export const caseFields = {
  missingSince: pastDate,
  missingPlace: placeText(160),
  lastKnownPlace: optPlaceText(160),
  city: optText(100),
  federalState: optState,
  circumstances: optText(5000),
  clothing: optText(2000),
  responsibleAuthority: optText(200),
  authorityContact: optText(300),
  internalReference: optText(200),
  internalNotes: optText(10000),
};

export const caseCreateSchema = z.object({
  person: z.object(personFields),
  ...caseFields,
  isDemo: boolish.default(false),
});
export type CaseCreateInput = z.infer<typeof caseCreateSchema>;

export const caseUpdateSchema = z
  .object(caseFields)
  .partial()
  .extend({
    person: z.object(personFields).partial().optional(),
    status: z.enum(CASE_STATUSES).optional(),
    isUrgent: boolish.optional(),
    statusNote: optText(1000),
  })
  .strict();
export type CaseUpdateInput = z.infer<typeof caseUpdateSchema>;

export const adminCaseListSchema = z.object({
  q: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(200).optional()),
  status: z.preprocess((v) => (v === "" ? undefined : v), z.enum(CASE_STATUSES).optional()),
  publication: z.preprocess((v) => (v === "" ? undefined : v), z.enum(PUBLICATION_STATUSES).optional()),
  ...pagination.shape,
});

// ───────────────────────────── Orte ─────────────────────────────

export const locationSchema = z.object({
  type: z.enum(LOCATION_TYPES),
  label: placeText(160),
  city: optText(100),
  federalState: optState,
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  precisionM: z.coerce.number().int().min(100, "Mindestens 100 m (keine adressgenauen Punkte)").max(100_000).default(1000),
  observedAt: z.preprocess(emptyToNull, pastDate.nullish()),
  visibility: z.enum(VISIBILITIES).default("INTERNAL"),
  isConfirmed: boolish.default(false),
  sourceId: optUuid,
});
export const locationUpdateSchema = locationSchema.partial();

// ───────────────────────────── Quellen ─────────────────────────────

export const sourceSchema = z.object({
  sourceType: z.enum(SOURCE_TYPES),
  organization: optText(200),
  title: reqText(300, 2),
  url: optUrl,
  publicationDate: z.preprocess(emptyToNull, optPastDate.nullable()),
  notes: optText(3000),
});
export const sourceUpdateSchema = sourceSchema.partial();

export const sourceVerifySchema = z.object({
  verified: boolish,
  note: optText(1000),
});

// ───────────────────────────── Chronologie ─────────────────────────────

export const timelineSchema = z.object({
  type: z.enum(TIMELINE_EVENT_TYPES),
  occurredAt: pastDate,
  description: reqText(2000, 3),
  sourceId: optUuid,
  locationId: optUuid,
  visibility: z.enum(VISIBILITIES).default("INTERNAL"),
});
export const timelineUpdateSchema = timelineSchema.partial();

// ───────────────────────────── Medien ─────────────────────────────

export const mediaUploadSchema = z.object({
  caseId: uuid,
  mediaType: z.enum(MEDIA_TYPES).default("SEARCH_IMAGE"),
  title: optText(200),
  sourceText: optText(300),
  sourceId: optUuid,
  copyrightStatus: z.enum(COPYRIGHT_STATUSES).default("UNKNOWN"),
});

export const mediaUpdateSchema = z.object({
  title: optText(200),
  sourceText: optText(300),
  sourceId: optUuid,
  copyrightStatus: z.enum(COPYRIGHT_STATUSES).optional(),
  visibility: z.enum(VISIBILITIES).optional(),
  reviewStatus: z.enum(REVIEW_STATUSES).optional(),
  isPrimary: boolish.optional(),
});

// ─────────────────────────── Moderation ───────────────────────────

export const decisionSchema = z.object({
  decision: z.enum(DECISIONS),
  note: optText(3000),
  assignToMe: boolish.optional(),
});
export type DecisionInput = z.infer<typeof decisionSchema>;

export const hintListSchema = z.object({
  status: z.preprocess((v) => (v === "" ? undefined : v), z.enum(HINT_STATUSES).optional()),
  case: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(40).optional()),
  ...pagination.shape,
});

export const submissionListSchema = z.object({
  status: z.preprocess((v) => (v === "" ? undefined : v), z.enum(SUBMISSION_STATUSES).optional()),
  ...pagination.shape,
});

export const reportListSchema = z.object({
  status: z.preprocess((v) => (v === "" ? undefined : v), z.enum(REPORT_STATUSES).optional()),
  ...pagination.shape,
});

// ─────────────────────────── Benutzer ───────────────────────────

export const userCreateSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Ungültige E-Mail-Adresse")),
  displayName: reqText(60, 2),
  password: passwordSchema,
  role: z.enum(ROLES),
});

export const userUpdateSchema = z.object({
  displayName: reqText(60, 2).optional(),
  role: z.enum(ROLES).optional(),
  isActive: boolish.optional(),
});

export const auditListSchema = z.object({
  entityType: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(40).optional()),
  entityId: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(80).optional()),
  actor: z.preprocess((v) => (v === "" ? undefined : v), uuid.optional()),
  ...pagination.shape,
});
