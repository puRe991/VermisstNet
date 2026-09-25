-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('VISITOR', 'REPORTER', 'MODERATOR', 'EDITOR', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'DIVERSE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PrivacyLevel" AS ENUM ('FULL_NAME', 'FIRST_NAME_INITIAL', 'ANONYMIZED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('ACTIVE', 'FOUND', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('MISSING_LOCATION', 'LAST_KNOWN_LOCATION', 'SIGHTING', 'POSSIBLE_LOCATION', 'TRAVEL_POINT');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'INTERNAL');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('OFFICIAL_AUTHORITY', 'POLICE', 'ORGANIZATION', 'FAMILY', 'MEDIA', 'USER_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('SEARCH_IMAGE', 'PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "CopyrightStatus" AS ENUM ('OFFICIAL_RELEASE', 'PERMISSION_GRANTED', 'LICENSED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('MISSING', 'POLICE_REPORT', 'PUBLIC_SEARCH', 'SIGHTING', 'NEW_INFORMATION', 'LOCATION_UPDATE', 'SOURCE_UPDATE', 'STATUS_CHANGE', 'FOUND');

-- CreateEnum
CREATE TYPE "HintType" AS ENUM ('PERSON_SEEN', 'POSSIBLE_LOCATION', 'VEHICLE', 'POSSIBLE_ROUTE', 'PHOTO', 'VIDEO', 'NEW_INFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "HintStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'REQUIRES_INFORMATION', 'VERIFIED', 'REJECTED', 'FORWARDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('CONFIRM', 'DEFER', 'REQUEST_INFO', 'REJECT', 'FORWARD', 'ARCHIVE', 'NOTE');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'REVIEW', 'SOURCE_VERIFICATION', 'APPROVED', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('INCORRECT_INFORMATION', 'PRIVACY_CONCERN', 'PERSON_FOUND', 'COPYRIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReviewEntity" AS ENUM ('HINT', 'SUBMISSION', 'SOURCE', 'REPORT', 'MEDIA', 'CASE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'REPORTER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" VARCHAR(255),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "birth_date" DATE,
    "age_at_missing" INTEGER,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "height_cm" INTEGER,
    "build" TEXT,
    "hair_color" TEXT,
    "eye_color" TEXT,
    "distinguishing_features" TEXT,
    "description" TEXT,
    "privacy_level" "PrivacyLevel" NOT NULL DEFAULT 'FIRST_NAME_INITIAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "public_number" TEXT NOT NULL,
    "person_id" UUID NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "missing_since" TIMESTAMP(3) NOT NULL,
    "missing_place" TEXT NOT NULL,
    "last_known_place" TEXT,
    "city" TEXT,
    "federal_state" TEXT,
    "circumstances" TEXT,
    "clothing" TEXT,
    "responsible_authority" TEXT,
    "authority_contact" TEXT,
    "internal_reference" TEXT,
    "internal_notes" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "search_vector" tsvector,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "type" "LocationType" NOT NULL,
    "label" TEXT NOT NULL,
    "city" TEXT,
    "federal_state" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "precision_m" INTEGER NOT NULL DEFAULT 1000,
    "observed_at" TIMESTAMP(3),
    "visibility" "Visibility" NOT NULL DEFAULT 'INTERNAL',
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "source_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "geom" geography(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography) STORED,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "organization" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "publication_date" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "verified_by_id" UUID,
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "case_id" UUID,
    "hint_id" UUID,
    "submission_id" UUID,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sha256" TEXT NOT NULL,
    "has_thumbnail" BOOLEAN NOT NULL DEFAULT false,
    "media_type" "MediaType" NOT NULL DEFAULT 'SEARCH_IMAGE',
    "title" TEXT,
    "source_text" TEXT,
    "source_id" UUID,
    "copyright_status" "CopyrightStatus" NOT NULL DEFAULT 'UNKNOWN',
    "visibility" "Visibility" NOT NULL DEFAULT 'INTERNAL',
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by_id" UUID,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "type" "TimelineEventType" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "source_id" UUID,
    "location_id" UUID,
    "created_by_id" UUID,
    "visibility" "Visibility" NOT NULL DEFAULT 'INTERNAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hints" (
    "id" UUID NOT NULL,
    "reference_code" TEXT NOT NULL,
    "case_id" UUID NOT NULL,
    "hint_type" "HintType" NOT NULL,
    "observed_date" DATE,
    "observed_time" TEXT,
    "location_text" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "contact_enc" TEXT,
    "status" "HintStatus" NOT NULL DEFAULT 'NEW',
    "last_decision" "Decision",
    "reporter_id" UUID,
    "assignee_id" UUID,
    "original_payload" JSONB NOT NULL,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "personal_data_erased_at" TIMESTAMP(3),

    CONSTRAINT "hints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_submissions" (
    "id" UUID NOT NULL,
    "reference_code" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "last_decision" "Decision",
    "original_payload" JSONB NOT NULL,
    "person_name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "missing_since" TIMESTAMP(3) NOT NULL,
    "missing_place" TEXT NOT NULL,
    "description" TEXT,
    "circumstances" TEXT,
    "source_text" TEXT NOT NULL,
    "source_url" TEXT,
    "contact_enc" TEXT,
    "reporter_id" UUID,
    "assignee_id" UUID,
    "case_id" UUID,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "personal_data_erased_at" TIMESTAMP(3),

    CONSTRAINT "case_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reports" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "message" TEXT NOT NULL,
    "contact_enc" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "last_decision" "Decision",
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_events" (
    "id" UUID NOT NULL,
    "entity_type" "ReviewEntity" NOT NULL,
    "entity_id" UUID NOT NULL,
    "actor_id" UUID,
    "decision" "Decision" NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_label" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "summary" TEXT NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "counters" (
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "cases_public_number_key" ON "cases"("public_number");

-- CreateIndex
CREATE INDEX "cases_publication_status_status_missing_since_idx" ON "cases"("publication_status", "status", "missing_since");

-- CreateIndex
CREATE INDEX "cases_federal_state_idx" ON "cases"("federal_state");

-- CreateIndex
CREATE INDEX "cases_city_idx" ON "cases"("city");

-- CreateIndex
CREATE INDEX "cases_person_id_idx" ON "cases"("person_id");

-- CreateIndex
CREATE INDEX "locations_case_id_type_idx" ON "locations"("case_id", "type");

-- CreateIndex
CREATE INDEX "sources_case_id_idx" ON "sources"("case_id");

-- CreateIndex
CREATE INDEX "sources_verified_at_idx" ON "sources"("verified_at");

-- CreateIndex
CREATE UNIQUE INDEX "media_storage_key_key" ON "media"("storage_key");

-- CreateIndex
CREATE INDEX "media_case_id_visibility_review_status_idx" ON "media"("case_id", "visibility", "review_status");

-- CreateIndex
CREATE INDEX "media_hint_id_idx" ON "media"("hint_id");

-- CreateIndex
CREATE INDEX "media_submission_id_idx" ON "media"("submission_id");

-- CreateIndex
CREATE INDEX "timeline_events_case_id_occurred_at_idx" ON "timeline_events"("case_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "hints_reference_code_key" ON "hints"("reference_code");

-- CreateIndex
CREATE INDEX "hints_status_created_at_idx" ON "hints"("status", "created_at");

-- CreateIndex
CREATE INDEX "hints_case_id_idx" ON "hints"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_submissions_reference_code_key" ON "case_submissions"("reference_code");

-- CreateIndex
CREATE UNIQUE INDEX "case_submissions_case_id_key" ON "case_submissions"("case_id");

-- CreateIndex
CREATE INDEX "case_submissions_status_created_at_idx" ON "case_submissions"("status", "created_at");

-- CreateIndex
CREATE INDEX "content_reports_status_created_at_idx" ON "content_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "review_events_entity_type_entity_id_created_at_idx" ON "review_events"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_window_start_idx" ON "rate_limit_buckets"("window_start");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_hint_id_fkey" FOREIGN KEY ("hint_id") REFERENCES "hints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "case_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hints" ADD CONSTRAINT "hints_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hints" ADD CONSTRAINT "hints_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hints" ADD CONSTRAINT "hints_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_submissions" ADD CONSTRAINT "case_submissions_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_submissions" ADD CONSTRAINT "case_submissions_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_submissions" ADD CONSTRAINT "case_submissions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────── VermisstAtlas: manuelle Ergänzungen ───────────────────────────

-- Geografischer Index
CREATE INDEX "locations_geom_gist" ON "locations" USING GIST ("geom");

-- Plausibilitätsprüfungen (Datenintegrität + Datenminimierung)
ALTER TABLE "locations" ADD CONSTRAINT "locations_lat_range" CHECK ("latitude" BETWEEN -90 AND 90);
ALTER TABLE "locations" ADD CONSTRAINT "locations_lng_range" CHECK ("longitude" BETWEEN -180 AND 180);
-- Keine adressgenauen Punkte: minimale gespeicherte Genauigkeit 100 m
ALTER TABLE "locations" ADD CONSTRAINT "locations_precision_min" CHECK ("precision_m" >= 100);
ALTER TABLE "hints" ADD CONSTRAINT "hints_lat_range" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90);
ALTER TABLE "hints" ADD CONSTRAINT "hints_lng_range" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);
ALTER TABLE "persons" ADD CONSTRAINT "persons_age_range" CHECK ("age_at_missing" IS NULL OR "age_at_missing" BETWEEN 0 AND 130);
ALTER TABLE "persons" ADD CONSTRAINT "persons_height_range" CHECK ("height_cm" IS NULL OR "height_cm" BETWEEN 30 AND 260);
-- Ein Fall darf nur veröffentlicht sein, wenn ein Veröffentlichungsdatum gesetzt ist
ALTER TABLE "cases" ADD CONSTRAINT "cases_published_at" CHECK ("publication_status" <> 'PUBLISHED' OR "published_at" IS NOT NULL);

-- Volltextsuche
CREATE INDEX "cases_search_vector_gin" ON "cases" USING GIN ("search_vector");

-- Baut den Suchvektor eines Falls AUSSCHLIESSLICH aus öffentlich freigegebenen Feldern.
-- Nicht veröffentlichte Fälle erhalten keinen Suchvektor (NULL) und sind damit
-- auch bei einem Filterfehler nicht über die Suche auffindbar.
-- Interne Felder (internal_reference, internal_notes, Quellen-Notizen, Geburtsdatum,
-- Nachname bei eingeschränkter Sichtbarkeit) fließen NIE ein.
CREATE OR REPLACE FUNCTION refresh_case_search(p_case_id uuid) RETURNS void
LANGUAGE sql AS $$
  UPDATE "cases" c SET "search_vector" = CASE
    WHEN c."publication_status" <> 'PUBLISHED' OR c."status" = 'ARCHIVED' THEN NULL
    ELSE
      setweight(to_tsvector('simple', replace(coalesce(c."public_number", ''), '-', ' ')), 'A') ||
      setweight(to_tsvector('simple', coalesce((
        SELECT CASE p."privacy_level"
          WHEN 'FULL_NAME' THEN p."first_name" || ' ' || coalesce(p."last_name", '')
          WHEN 'FIRST_NAME_INITIAL' THEN p."first_name"
          ELSE ''
        END FROM "persons" p WHERE p."id" = c."person_id"), '')), 'A') ||
      setweight(to_tsvector('simple',
        coalesce(c."missing_place", '') || ' ' || coalesce(c."last_known_place", '') || ' ' ||
        coalesce(c."city", '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(c."circumstances", '') || ' ' || coalesce(c."clothing", '')), 'C') ||
      setweight(to_tsvector('simple', coalesce((
        SELECT string_agg(coalesce(s."title", '') || ' ' || coalesce(s."organization", ''), ' ')
        FROM "sources" s WHERE s."case_id" = c."id" AND s."verified_at" IS NOT NULL), '')), 'D')
  END
  WHERE c."id" = p_case_id;
$$;

-- Audit-Log ist append-only: UPDATE und DELETE werden auf Datenbankebene verhindert.
CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;
CREATE TRIGGER "audit_logs_no_update" BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();
