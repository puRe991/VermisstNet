import "server-only";
import { Prisma } from "@prisma/client";
import { COMPUTED_LABEL } from "@/lib/labels";
import { PUBLIC_GRID_DEG, PUBLIC_GRID_DEG_MINOR, generalizeCoordinate, type BBox } from "@/lib/geo";
import { ageAtMissing, caseHeadline, isMinor, publicDisplayName } from "@/lib/person";
import { buildPrefixTsQuery, looksLikeCaseNumber } from "@/lib/search";
import type { CaseFilter, CaseListQuery } from "@/lib/validation/public";
import type { PublicCaseStatusValue } from "@/lib/enums";
import { prisma } from "../db";
import { notFound } from "../errors";
import {
  mediaUrl,
  publicCaseDetailSelect,
  publicCaseSummarySelect,
  toPublicCaseDetail,
  toPublicCaseSummary,
  type PublicCaseDetail,
  type PublicCaseSummary,
  type PublicMapMarker,
  type PublicSource,
  type PublicTimelineEvent,
} from "../dto/public";

/**
 * Basis-Bedingung für ALLE öffentlichen Abfragen. Wird in SQL angewendet, nicht nachträglich.
 */
export const PUBLIC_CASE_WHERE = {
  publicationStatus: "PUBLISHED",
  status: { in: ["ACTIVE", "FOUND", "CLOSED"] },
} satisfies Prisma.CaseWhereInput;

/** Alter zum Zeitpunkt des Verschwindens in SQL (Geburtsdatum hat Vorrang). */
const AGE_SQL = Prisma.sql`COALESCE(date_part('year', age(c."missing_since"::date, p."birth_date"))::int, p."age_at_missing")`;

function escapeLike(v: string): string {
  return v.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** Baut die WHERE-Bedingungen (parametrisiert) für Liste und Karte. */
function filterConditions(filter: CaseFilter, statuses: readonly PublicCaseStatusValue[]): Prisma.Sql[] {
  const conds: Prisma.Sql[] = [
    Prisma.sql`c."publication_status" = 'PUBLISHED'`,
    Prisma.sql`c."status"::text IN (${Prisma.join(statuses)})`,
  ];
  const tsq = buildPrefixTsQuery(filter.q);
  if (filter.q && looksLikeCaseNumber(filter.q)) {
    conds.push(Prisma.sql`c."public_number" = ${filter.q.trim().toUpperCase()}`);
  } else if (tsq) {
    conds.push(Prisma.sql`c."search_vector" @@ to_tsquery('simple', ${tsq})`);
  }
  if (filter.gender?.length) conds.push(Prisma.sql`p."gender"::text IN (${Prisma.join(filter.gender)})`);
  if (filter.ageMin !== undefined) conds.push(Prisma.sql`${AGE_SQL} >= ${filter.ageMin}`);
  if (filter.ageMax !== undefined) conds.push(Prisma.sql`${AGE_SQL} <= ${filter.ageMax}`);
  if (filter.state) conds.push(Prisma.sql`c."federal_state" = ${filter.state}`);
  if (filter.city) conds.push(Prisma.sql`c."city" ILIKE ${escapeLike(filter.city) + "%"}`);
  if (filter.since) conds.push(Prisma.sql`c."missing_since" >= ${filter.since}`);
  if (filter.until) conds.push(Prisma.sql`c."missing_since" <= ${filter.until}`);
  if (filter.urgent) conds.push(Prisma.sql`c."is_urgent" = true AND c."status" = 'ACTIVE'`);
  if (filter.sourceType) {
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM "sources" s WHERE s."case_id" = c."id"
      AND s."verified_at" IS NOT NULL AND s."source_type"::text = ${filter.sourceType})`);
  }
  return conds;
}

export type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };

/** Öffentliche Suche mit Filtern und Pagination. */
export async function searchPublicCases(query: CaseListQuery): Promise<Paginated<PublicCaseSummary>> {
  const statuses = query.status?.length ? query.status : (["ACTIVE"] as const);
  const where = Prisma.join(filterConditions(query, statuses), " AND ");
  const tsq = !looksLikeCaseNumber(query.q) ? buildPrefixTsQuery(query.q) : null;
  const order = tsq
    ? Prisma.sql`ts_rank(c."search_vector", to_tsquery('simple', ${tsq})) DESC, c."missing_since" DESC`
    : Prisma.sql`(c."is_urgent" AND c."status" = 'ACTIVE') DESC, c."missing_since" DESC`;
  const offset = (query.page - 1) * query.pageSize;

  const [countRows, idRows] = await Promise.all([
    prisma.$queryRaw<{ total: bigint }[]>`
      SELECT count(*) AS total FROM "cases" c JOIN "persons" p ON p."id" = c."person_id" WHERE ${where}`,
    prisma.$queryRaw<{ id: string }[]>`
      SELECT c."id" FROM "cases" c JOIN "persons" p ON p."id" = c."person_id"
      WHERE ${where} ORDER BY ${order}, c."id" LIMIT ${query.pageSize} OFFSET ${offset}`,
  ]);

  const total = Number(countRows[0]?.total ?? 0);
  const ids = idRows.map((r) => r.id);
  const rows = ids.length
    ? await prisma.case.findMany({ where: { id: { in: ids }, ...PUBLIC_CASE_WHERE }, select: publicCaseSummarySelect })
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [toPublicCaseSummary(row)] : [];
  });
  return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) };
}

export async function latestPublicCases(limit = 6): Promise<PublicCaseSummary[]> {
  const rows = await prisma.case.findMany({
    where: { ...PUBLIC_CASE_WHERE, status: "ACTIVE" },
    select: publicCaseSummarySelect,
    orderBy: [{ missingSince: "desc" }],
    take: limit,
  });
  return rows.map(toPublicCaseSummary);
}

/** Öffentliche Fallseite. Nicht veröffentlichte/archivierte Fälle → 404 (keine Existenzbestätigung). */
export async function getPublicCase(publicNumber: string): Promise<PublicCaseDetail> {
  if (!looksLikeCaseNumber(publicNumber)) throw notFound("Fall");
  const row = await prisma.case.findFirst({
    where: { publicNumber: publicNumber.toUpperCase(), ...PUBLIC_CASE_WHERE },
    select: publicCaseDetailSelect,
  });
  if (!row) throw notFound("Fall");
  return toPublicCaseDetail(row);
}

export async function getPublicTimeline(publicNumber: string): Promise<PublicTimelineEvent[]> {
  return (await getPublicCase(publicNumber)).timeline;
}

export async function getPublicSources(publicNumber: string): Promise<PublicSource[]> {
  return (await getPublicCase(publicNumber)).sources;
}

/** Minimale Existenzprüfung für Formulare (Hinweis/Meldung) – nur aktive, veröffentlichte Fälle. */
export async function findPublicCaseId(publicNumber: string, opts: { activeOnly: boolean }): Promise<string> {
  if (!looksLikeCaseNumber(publicNumber)) throw notFound("Fall");
  const row = await prisma.case.findFirst({
    where: {
      publicNumber: publicNumber.toUpperCase(),
      ...PUBLIC_CASE_WHERE,
      ...(opts.activeOnly ? { status: "ACTIVE" } : {}),
    },
    select: { id: true },
  });
  if (!row) throw notFound("Fall");
  return row.id;
}

// ─────────────────────────────────── Karte ───────────────────────────────────

const MAP_LIMIT = 2000;

type MarkerRow = {
  public_number: string;
  first_name: string;
  last_name: string | null;
  privacy_level: "FULL_NAME" | "FIRST_NAME_INITIAL" | "ANONYMIZED";
  gender: "FEMALE" | "MALE" | "DIVERSE" | "UNKNOWN";
  age: number | null;
  place: string;
  missing_since: Date;
  is_urgent: boolean;
  is_demo: boolean;
  latitude: number;
  longitude: number;
  precision_m: number;
  thumb_id: string | null;
  has_thumbnail: boolean | null;
};

/**
 * Marker für die Karte: ein Punkt je aktivem Fall (letzter bekannter Ort bevorzugt).
 * Nur öffentliche Orte; Koordinaten werden serverseitig generalisiert.
 */
export async function getMapMarkers(
  filter: CaseFilter,
  bbox: BBox | null,
): Promise<{ items: PublicMapMarker[]; truncated: boolean }> {
  // Gefundene/abgeschlossene Fälle erscheinen nie auf der Karte
  const conds = filterConditions(filter, ["ACTIVE"]);
  const bboxSql = bbox
    ? Prisma.sql`AND l."geom" && ST_MakeEnvelope(${bbox.minLng}, ${bbox.minLat}, ${bbox.maxLng}, ${bbox.maxLat}, 4326)::geography`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<MarkerRow[]>`
    SELECT * FROM (
      SELECT DISTINCT ON (c."id")
        c."public_number", p."first_name", p."last_name", p."privacy_level"::text AS privacy_level,
        p."gender"::text AS gender, ${AGE_SQL} AS age, c."missing_place" AS place, c."missing_since",
        c."is_urgent", c."is_demo", l."latitude", l."longitude", l."precision_m",
        m."id" AS thumb_id, m."has_thumbnail"
      FROM "cases" c
      JOIN "persons" p ON p."id" = c."person_id"
      JOIN "locations" l ON l."case_id" = c."id"
        AND l."visibility" = 'PUBLIC'
        AND l."type" IN ('LAST_KNOWN_LOCATION', 'MISSING_LOCATION')
        ${bboxSql}
      LEFT JOIN LATERAL (
        SELECT mm."id", mm."has_thumbnail" FROM "media" mm
        WHERE mm."case_id" = c."id" AND mm."visibility" = 'PUBLIC' AND mm."review_status" = 'APPROVED'
          AND mm."copyright_status" <> 'UNKNOWN' AND mm."media_type" IN ('SEARCH_IMAGE', 'PHOTO')
        ORDER BY mm."is_primary" DESC, mm."uploaded_at" ASC LIMIT 1
      ) m ON true
      WHERE ${Prisma.join(conds, " AND ")}
      ORDER BY c."id", (l."type" = 'LAST_KNOWN_LOCATION') DESC, l."observed_at" DESC NULLS LAST
    ) t
    ORDER BY t."missing_since" DESC
    LIMIT ${MAP_LIMIT + 1}`;

  const truncated = rows.length > MAP_LIMIT;
  const items = rows.slice(0, MAP_LIMIT).map((r): PublicMapMarker => {
    const age = r.age === null ? null : Number(r.age);
    const g = generalizeCoordinate(r.latitude, r.longitude, { minor: isMinor(age), precisionM: r.precision_m });
    return {
      publicNumber: r.public_number,
      displayName: publicDisplayName({ firstName: r.first_name, lastName: r.last_name, privacyLevel: r.privacy_level }),
      headline: caseHeadline(age, r.gender, "ACTIVE"),
      age,
      place: r.place,
      missingSince: r.missing_since.toISOString(),
      status: "ACTIVE",
      isUrgent: r.is_urgent,
      lat: g.lat,
      lng: g.lng,
      precisionM: g.precisionM,
      thumbUrl: r.thumb_id ? mediaUrl(r.thumb_id, r.has_thumbnail ? "thumb" : "full") : null,
      isDemo: r.is_demo,
    };
  });
  return { items, truncated };
}

// ─────────────────────────────── Geo-Analyse ───────────────────────────────

export type GeoAnalysis = {
  computed: true;
  label: typeof COMPUTED_LABEL;
  disclaimer: string;
  segments: {
    from: string;
    to: string;
    fromType: string;
    toType: string;
    distanceKm: number;
    hoursBetween: number | null;
  }[];
  totalDistanceKm: number;
};

/**
 * Automatisch berechnete Entfernungen/Abfolge zwischen öffentlichen Orten (PostGIS).
 * Berechnung auf den GENERALISIERTEN Koordinaten, damit keine genaueren Positionen ableitbar sind.
 * Es wird ausdrücklich KEINE Aussage über den tatsächlichen Aufenthaltsort getroffen.
 */
export async function getGeoAnalysis(publicNumber: string): Promise<GeoAnalysis> {
  const c = await prisma.case.findFirst({
    where: { publicNumber: publicNumber.toUpperCase(), ...PUBLIC_CASE_WHERE },
    select: { id: true, status: true, missingSince: true, person: { select: { birthDate: true, ageAtMissing: true } } },
  });
  if (!c) throw notFound("Fall");
  const base: GeoAnalysis = {
    computed: true,
    label: COMPUTED_LABEL,
    disclaimer:
      "Diese Angaben wurden automatisch aus veröffentlichten Ortsangaben berechnet. Sie sind nicht bestätigt und sagen nichts über den tatsächlichen Aufenthaltsort der Person aus.",
    segments: [],
    totalDistanceKm: 0,
  };
  if (c.status !== "ACTIVE") return base;

  const step = isMinor(ageAtMissing(c.person, c.missingSince)) ? PUBLIC_GRID_DEG_MINOR : PUBLIC_GRID_DEG;
  const rows = await prisma.$queryRaw<
    { label: string; type: string; observed_at: Date | null; next_label: string | null; next_type: string | null; next_observed_at: Date | null; distance_m: number | null }[]
  >`
    WITH pts AS (
      SELECT l."label", l."type"::text AS type, l."observed_at",
             ST_SnapToGrid(l."geom"::geometry, ${step}) AS g,
             row_number() OVER (ORDER BY l."observed_at" ASC NULLS FIRST, l."created_at" ASC) AS rn
      FROM "locations" l
      WHERE l."case_id" = ${c.id}::uuid AND l."visibility" = 'PUBLIC'
    )
    SELECT a."label", a."type", a."observed_at",
           b."label" AS next_label, b."type" AS next_type, b."observed_at" AS next_observed_at,
           ST_Distance(ST_SetSRID(a.g, 4326)::geography, ST_SetSRID(b.g, 4326)::geography) AS distance_m
    FROM pts a JOIN pts b ON b.rn = a.rn + 1
    ORDER BY a.rn`;

  base.segments = rows.map((r) => ({
    from: r.label,
    to: r.next_label ?? "",
    fromType: r.type,
    toType: r.next_type ?? "",
    distanceKm: Math.round(((r.distance_m ?? 0) / 1000) * 10) / 10,
    hoursBetween:
      r.observed_at && r.next_observed_at
        ? Math.round(((r.next_observed_at.getTime() - r.observed_at.getTime()) / 3600000) * 10) / 10
        : null,
  }));
  base.totalDistanceKm = Math.round(base.segments.reduce((s, x) => s + x.distanceKm, 0) * 10) / 10;
  return base;
}
