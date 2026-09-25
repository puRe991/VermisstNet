import "server-only";
import type { Prisma } from "@prisma/client";
import { federalStateName } from "@/lib/federal-states";
import { generalizeCoordinate } from "@/lib/geo";
import { ageAtMissing, caseHeadline, isMinor, publicDisplayName } from "@/lib/person";
import type {
  CopyrightStatusValue,
  GenderValue,
  LocationTypeValue,
  PublicCaseStatusValue,
  SourceTypeValue,
  TimelineEventTypeValue,
} from "@/lib/enums";

// ════════════════════════════════════════════════════════════════════════════════════
// ÖFFENTLICHE DATENOBJEKTE – ALLOWLIST
// Jedes Feld, das hier nicht ausdrücklich gemappt wird, ist NICHT öffentlich.
// Interne Felder (internalReference, internalNotes, birthDate, notes, verifiedBy, storageKey,
// Hinweise, Kontaktdaten …) dürfen in diesem Modul niemals auftauchen.
// ════════════════════════════════════════════════════════════════════════════════════

/** Bedingung für öffentlich sichtbare Bilder (in DB-Abfragen verwenden). */
export const PUBLIC_MEDIA_WHERE = {
  visibility: "PUBLIC",
  reviewStatus: "APPROVED",
  copyrightStatus: { not: "UNKNOWN" },
  mediaType: { in: ["SEARCH_IMAGE", "PHOTO"] },
} satisfies Prisma.MediaWhereInput;

/** Minimal benötigte Felder – `select` verhindert, dass interne Daten überhaupt geladen werden. */
export const publicCaseSummarySelect = {
  id: true,
  publicNumber: true,
  status: true,
  isUrgent: true,
  missingSince: true,
  missingPlace: true,
  city: true,
  federalState: true,
  isDemo: true,
  person: {
    select: { firstName: true, lastName: true, privacyLevel: true, birthDate: true, ageAtMissing: true, gender: true },
  },
  media: {
    where: PUBLIC_MEDIA_WHERE,
    select: { id: true, title: true, isPrimary: true, hasThumbnail: true },
    orderBy: [{ isPrimary: "desc" }, { uploadedAt: "asc" }],
    take: 1,
  },
} satisfies Prisma.CaseSelect;

export const publicCaseDetailSelect = {
  ...publicCaseSummarySelect,
  lastKnownPlace: true,
  circumstances: true,
  clothing: true,
  responsibleAuthority: true,
  authorityContact: true,
  publishedAt: true,
  updatedAt: true,
  person: {
    select: {
      firstName: true,
      lastName: true,
      privacyLevel: true,
      birthDate: true, // nur zur Altersberechnung, wird NICHT ausgegeben
      ageAtMissing: true,
      gender: true,
      heightCm: true,
      build: true,
      hairColor: true,
      eyeColor: true,
      distinguishingFeatures: true,
      description: true,
    },
  },
  media: {
    where: PUBLIC_MEDIA_WHERE,
    select: {
      id: true,
      title: true,
      sourceText: true,
      copyrightStatus: true,
      isPrimary: true,
      hasThumbnail: true,
      width: true,
      height: true,
    },
    orderBy: [{ isPrimary: "desc" }, { uploadedAt: "asc" }],
  },
  locations: {
    where: { visibility: "PUBLIC" },
    select: {
      id: true,
      type: true,
      label: true,
      latitude: true,
      longitude: true,
      precisionM: true,
      observedAt: true,
      isConfirmed: true,
    },
    orderBy: [{ observedAt: "asc" }],
  },
  sources: {
    where: { verifiedAt: { not: null } },
    select: {
      id: true,
      sourceType: true,
      organization: true,
      title: true,
      url: true,
      publicationDate: true,
      verifiedAt: true,
    },
    orderBy: [{ verifiedAt: "desc" }],
  },
  timelineEvents: {
    where: { visibility: "PUBLIC" },
    select: {
      id: true,
      type: true,
      occurredAt: true,
      description: true,
      source: { select: { title: true, organization: true, url: true, verifiedAt: true } },
    },
    orderBy: [{ occurredAt: "asc" }],
  },
} satisfies Prisma.CaseSelect;

type SummaryRow = Prisma.CaseGetPayload<{ select: typeof publicCaseSummarySelect }>;
type DetailRow = Prisma.CaseGetPayload<{ select: typeof publicCaseDetailSelect }>;

export type PublicImage = { id: string; url: string; thumbUrl: string; alt: string };

export type PublicCaseSummary = {
  publicNumber: string;
  displayName: string | null;
  headline: string;
  age: number | null;
  gender: GenderValue;
  status: PublicCaseStatusValue;
  isUrgent: boolean;
  missingSince: string;
  place: string;
  city: string | null;
  federalState: string | null;
  federalStateName: string | null;
  primaryImage: PublicImage | null;
  isDemo: boolean;
};

export type PublicSource = {
  id: string;
  sourceType: SourceTypeValue;
  organization: string | null;
  title: string;
  url: string | null;
  publicationDate: string | null;
  verifiedAt: string;
};

export type PublicTimelineEvent = {
  id: string;
  type: TimelineEventTypeValue;
  occurredAt: string;
  description: string;
  source: { title: string; organization: string | null; url: string | null } | null;
};

export type PublicLocation = {
  id: string;
  type: LocationTypeValue;
  label: string;
  lat: number;
  lng: number;
  precisionM: number;
  observedAt: string | null;
  isConfirmed: boolean;
};

export type PublicCaseDetail = PublicCaseSummary & {
  lastKnownPlace: string | null;
  circumstances: string | null;
  clothing: string | null;
  responsibleAuthority: string | null;
  authorityContact: string | null;
  person: {
    heightCm: number | null;
    build: string | null;
    hairColor: string | null;
    eyeColor: string | null;
    distinguishingFeatures: string | null;
    description: string | null;
  } | null;
  images: (PublicImage & { title: string | null; sourceText: string | null; copyrightStatus: CopyrightStatusValue })[];
  locations: PublicLocation[];
  sources: PublicSource[];
  timeline: PublicTimelineEvent[];
  publishedAt: string | null;
  updatedAt: string;
  lastVerifiedAt: string | null;
  /** true, wenn die Person gefunden/der Fall abgeschlossen ist → reduzierte Darstellung */
  reduced: boolean;
};

export function mediaUrl(id: string, variant: "full" | "thumb" = "full"): string {
  return variant === "thumb" ? `/api/media/${id}/file?variant=thumb` : `/api/media/${id}/file`;
}

function toPublicStatus(status: string): PublicCaseStatusValue {
  if (status === "ACTIVE" || status === "FOUND" || status === "CLOSED") return status;
  // ARCHIVED darf nie bis hierher gelangen (Abfragen filtern) – defensiv abfangen
  throw new Error("Nicht öffentlicher Fallstatus in öffentlicher Ausgabe");
}

function image(m: { id: string; title: string | null; hasThumbnail: boolean }, alt: string): PublicImage {
  return { id: m.id, url: mediaUrl(m.id), thumbUrl: m.hasThumbnail ? mediaUrl(m.id, "thumb") : mediaUrl(m.id), alt };
}

export function toPublicCaseSummary(row: SummaryRow): PublicCaseSummary {
  const status = toPublicStatus(row.status);
  const age = ageAtMissing(row.person, row.missingSince);
  const displayName = publicDisplayName(row.person);
  const headline = caseHeadline(age, row.person.gender, status);
  const primary = status === "ACTIVE" ? row.media[0] : undefined;
  return {
    publicNumber: row.publicNumber,
    displayName,
    headline,
    age,
    gender: row.person.gender,
    status,
    isUrgent: status === "ACTIVE" && row.isUrgent,
    missingSince: row.missingSince.toISOString(),
    place: row.missingPlace,
    city: row.city,
    federalState: row.federalState,
    federalStateName: federalStateName(row.federalState),
    primaryImage: primary ? image(primary, `Suchbild: ${displayName ?? headline}`) : null,
    isDemo: row.isDemo,
  };
}

export function toPublicCaseDetail(row: DetailRow): PublicCaseDetail {
  const summary = toPublicCaseSummary(row);
  const reduced = summary.status !== "ACTIVE";
  const age = summary.age;
  const minor = isMinor(age);
  const lastVerified = row.sources.reduce<Date | null>(
    (acc, s) => (s.verifiedAt && (!acc || s.verifiedAt > acc) ? s.verifiedAt : acc),
    null,
  );

  const sources: PublicSource[] = row.sources.map((s) => ({
    id: s.id,
    sourceType: s.sourceType,
    organization: s.organization,
    title: s.title,
    url: s.url,
    publicationDate: s.publicationDate?.toISOString() ?? null,
    verifiedAt: s.verifiedAt!.toISOString(),
  }));

  return {
    ...summary,
    lastKnownPlace: reduced ? null : row.lastKnownPlace,
    circumstances: reduced ? null : row.circumstances,
    clothing: reduced ? null : row.clothing,
    responsibleAuthority: row.responsibleAuthority,
    authorityContact: reduced ? null : row.authorityContact,
    person: reduced
      ? null
      : {
          heightCm: row.person.heightCm,
          build: row.person.build,
          hairColor: row.person.hairColor,
          eyeColor: row.person.eyeColor,
          distinguishingFeatures: row.person.distinguishingFeatures,
          description: row.person.description,
        },
    images: reduced
      ? []
      : row.media.map((m) => ({
          ...image(m, m.title ?? `Suchbild: ${summary.displayName ?? summary.headline}`),
          title: m.title,
          sourceText: m.sourceText,
          copyrightStatus: m.copyrightStatus,
        })),
    locations: reduced
      ? []
      : row.locations.map((l) => {
          const g = generalizeCoordinate(l.latitude, l.longitude, { minor, precisionM: l.precisionM });
          return {
            id: l.id,
            type: l.type,
            label: l.label,
            lat: g.lat,
            lng: g.lng,
            precisionM: g.precisionM,
            observedAt: l.observedAt?.toISOString() ?? null,
            isConfirmed: l.isConfirmed,
          };
        }),
    sources,
    timeline: row.timelineEvents.map((e) => ({
      id: e.id,
      type: e.type,
      occurredAt: e.occurredAt.toISOString(),
      description: e.description,
      // Quelle nur anzeigen, wenn verifiziert
      source: e.source?.verifiedAt
        ? { title: e.source.title, organization: e.source.organization, url: e.source.url }
        : null,
    })),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    lastVerifiedAt: lastVerified?.toISOString() ?? null,
    reduced,
  };
}

export type PublicMapMarker = {
  publicNumber: string;
  displayName: string | null;
  headline: string;
  age: number | null;
  place: string;
  missingSince: string;
  status: PublicCaseStatusValue;
  isUrgent: boolean;
  lat: number;
  lng: number;
  precisionM: number;
  thumbUrl: string | null;
  isDemo: boolean;
};
