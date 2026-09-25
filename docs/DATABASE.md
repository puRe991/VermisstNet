# VermisstAtlas – Datenbank

PostgreSQL ≥ 15 mit PostGIS ≥ 3. Schema: [`prisma/schema.prisma`](../prisma/schema.prisma),
Migrationen: `prisma/migrations/`. Tabellen und Spalten sind `snake_case`.

## 1. Übersicht (ER)

```
users ─┬─< sessions
       ├─< audit_logs            (append-only)
       ├─< review_events         (Moderationsverlauf)
       └─ (Ersteller/Verifizierer/Uploader/Zuständige …)

persons ─< cases ─┬─< locations     (PostGIS geography, GiST)
                  ├─< sources ──┬─< locations.source_id
                  │             ├─< timeline_events.source_id
                  │             └─< media.source_id
                  ├─< media
                  ├─< timeline_events ── locations (optional)
                  ├─< hints ─< media (Anhänge)
                  ├── case_submissions (1:1, optional) ─< media (Suchbild)
                  └─< content_reports

rate_limit_buckets, counters   (technisch)
```

## 2. Tabellen

Legende: **INTERNAL** = darf niemals öffentlich ausgegeben werden.

### persons
| Spalte | Typ | Hinweis |
|---|---|---|
| id | uuid PK | |
| first_name | text | öffentlich je nach `privacy_level` |
| last_name | text? | öffentlich nur bei `FULL_NAME`, sonst Initial bzw. nichts |
| birth_date | date? | **INTERNAL** – öffentlich wird nur das Alter berechnet |
| age_at_missing | int? | Alternative, falls Geburtsdatum unbekannt (CHECK 0–130) |
| gender | enum FEMALE/MALE/DIVERSE/UNKNOWN | |
| height_cm | int? | CHECK 30–260 |
| build, hair_color, eye_color | text? | Statur, Haar-, Augenfarbe |
| distinguishing_features | text? | besondere Merkmale |
| description | text? | weitere Beschreibung |
| privacy_level | enum FULL_NAME / FIRST_NAME_INITIAL / ANONYMIZED | Datenschutz-/Sichtbarkeitsstufe (Default FIRST_NAME_INITIAL) |

### cases
| Spalte | Typ | Hinweis |
|---|---|---|
| id | uuid PK | intern; öffentlich wird `public_number` verwendet |
| public_number | text UNIQUE | `VA-JJJJ-NNNNNN`, aus `counters` fortlaufend vergeben |
| person_id | uuid FK → persons (RESTRICT) | |
| status | enum ACTIVE/FOUND/CLOSED/ARCHIVED | |
| publication_status | enum DRAFT/PUBLISHED/UNPUBLISHED | CHECK: PUBLISHED ⇒ `published_at` gesetzt |
| is_urgent | bool | Dringlichkeit, nur editor/admin |
| missing_since | timestamptz | Vermisst seit |
| missing_place | text | Vermisstenort (Ort/Stadtteil, keine Adresse) |
| last_known_place | text? | letzter bestätigter Aufenthaltsort |
| city, federal_state | text? | Filter; Bundesland als ISO-3166-2 (`DE-NW`) |
| circumstances | text? | Beschreibung der Umstände (öffentlich) |
| clothing | text? | Bekleidung |
| responsible_authority, authority_contact | text? | zuständige Stelle + öffentlicher Kontakt |
| internal_reference | text? | **INTERNAL** – z. B. Aktenzeichen |
| internal_notes | text? | **INTERNAL** |
| is_demo | bool | Kennzeichnung „DEMO DATA“ |
| created_by_id | uuid? FK → users | |
| created_at, updated_at, published_at, closed_at | timestamptz | |
| search_vector | tsvector | nur aus öffentlichen Feldern, NULL wenn nicht veröffentlicht |

Indizes: `(publication_status, status, missing_since)`, `federal_state`, `city`,
`person_id`, GIN(`search_vector`).

### locations
| Spalte | Typ | Hinweis |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases (CASCADE) | |
| type | enum MISSING_LOCATION / LAST_KNOWN_LOCATION / SIGHTING / POSSIBLE_LOCATION / TRAVEL_POINT | |
| label | text | z. B. „Hagen, Innenstadt“ – **keine Hausnummern** |
| city, federal_state | text? | |
| latitude, longitude | double | CHECK Wertebereich |
| precision_m | int | CHECK ≥ 100 → keine adressgenauen Punkte |
| observed_at | timestamptz? | |
| visibility | enum PUBLIC/INTERNAL | Default INTERNAL |
| is_confirmed | bool | bestätigt vs. möglich |
| source_id | uuid? FK → sources | |
| geom | geography(Point,4326) | **GENERATED ALWAYS** aus lat/lng, GiST-Index |

### sources
| Spalte | Typ | Hinweis |
|---|---|---|
| id, case_id | uuid | |
| source_type | enum OFFICIAL_AUTHORITY / POLICE / ORGANIZATION / FAMILY / MEDIA / USER_REPORT / OTHER | |
| organization, title, url | text | URL nur `http(s)` (Validierung) |
| publication_date | timestamptz? | |
| verified_at, verified_by_id | | öffentlich nur verifizierte Quellen; `verified_by` wird nicht öffentlich ausgegeben |
| notes | text? | **INTERNAL** |

### media
| Spalte | Typ | Hinweis |
|---|---|---|
| id | uuid PK | öffentlich über `/api/media/:id/file` |
| case_id / hint_id / submission_id | uuid? | genau ein Besitzer |
| storage_key | text UNIQUE | **INTERNAL** – Pfad im Storage, zufällig generiert |
| mime_type, size_bytes, width, height, sha256, has_thumbnail | | nach Re-Encoding |
| media_type | enum SEARCH_IMAGE / PHOTO / VIDEO | |
| title, source_text, source_id | | Bildquelle |
| copyright_status | enum OFFICIAL_RELEASE / PERMISSION_GRANTED / LICENSED / UNKNOWN | UNKNOWN ⇒ nie öffentlich |
| visibility | PUBLIC/INTERNAL | Default INTERNAL |
| review_status | PENDING/APPROVED/REJECTED | Default PENDING |
| is_primary | bool | Haupt-Suchbild |
| uploaded_by_id, uploaded_at | | |

### timeline_events
`id, case_id, type (MISSING, POLICE_REPORT, PUBLIC_SEARCH, SIGHTING, NEW_INFORMATION,
LOCATION_UPDATE, SOURCE_UPDATE, STATUS_CHANGE, FOUND), occurred_at, description, source_id?,
location_id?, created_by_id?, visibility (Default INTERNAL), created_at, updated_at`.
Index `(case_id, occurred_at)`.

### hints (immer intern)
`id, reference_code (UNIQUE, für Rückfragen), case_id, hint_type (PERSON_SEEN,
POSSIBLE_LOCATION, VEHICLE, POSSIBLE_ROUTE, PHOTO, VIDEO, NEW_INFORMATION, OTHER),
observed_date, observed_time, location_text, latitude?, longitude?, description, is_anonymous,
contact_enc (AES-256-GCM), status (NEW, UNDER_REVIEW, REQUIRES_INFORMATION, VERIFIED, REJECTED,
FORWARDED, ARCHIVED), last_decision, reporter_id?, assignee_id?, original_payload (jsonb,
unveränderte Originaleingabe ohne Kontakt), ip_hash, created_at, updated_at,
personal_data_erased_at`.

### case_submissions
`id, reference_code, status (SUBMITTED, REVIEW, SOURCE_VERIFICATION, APPROVED, PUBLISHED,
REJECTED), last_decision, original_payload, person_name, age, gender, missing_since,
missing_place, description, circumstances, source_text, source_url, contact_enc, reporter_id?,
assignee_id?, case_id? (UNIQUE, nach Übernahme), ip_hash, created_at, updated_at,
personal_data_erased_at`.

### content_reports
Gemeldete Inhalte zu einer Fallseite: `reason (INCORRECT_INFORMATION, PRIVACY_CONCERN,
PERSON_FOUND, COPYRIGHT, OTHER), message, contact_enc, status (OPEN, IN_PROGRESS, RESOLVED,
DISMISSED), last_decision, ip_hash`.

### review_events
Bearbeitungsverlauf je Moderationsobjekt: `entity_type (HINT, SUBMISSION, SOURCE, REPORT,
MEDIA, CASE), entity_id, actor_id, decision, from_status, to_status, note (INTERNAL),
created_at`.

### audit_logs (append-only)
`actor_id, actor_label („Moderator Florian“, bleibt bei Umbenennung erhalten), action
(z. B. `case.status_change`), entity_type, entity_id, summary („Moderator Florian änderte
Status von ACTIVE auf FOUND“), old_data (jsonb), new_data (jsonb), ip_hash, created_at`.
Ein Trigger verhindert `UPDATE`/`DELETE`. Benutzer werden deshalb nie gelöscht, sondern
deaktiviert.

### users, sessions
`users`: `email UNIQUE, display_name, password_hash (argon2id), role, is_active,
last_login_at`. `sessions`: `token_hash UNIQUE (SHA-256), user_id, expires_at, last_seen_at,
user_agent`.

### rate_limit_buckets, counters
Fixed-Window-Zähler (`key = bucket:hmac(ip)`), Zähler für Fallnummern.

## 3. PostGIS

- `locations.geom geography(Point,4326) GENERATED ALWAYS AS
  (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED`
- Index `locations_geom_gist` (GiST).
- Kartenabfragen: `geom && ST_MakeEnvelope(...)` (BBox, indexgestützt).
- Geo-Analyse: `ST_Distance(a.geom, b.geom)` (Meter, Geodäte).

## 4. Volltextsuche

- `refresh_case_search(case_id)` (SQL-Funktion) setzt `search_vector` **nur** für
  veröffentlichte Fälle und **nur** aus: Fallnummer, öffentlichem Namen (je nach
  `privacy_level`), Orten, Umständen, Bekleidung, Titel/Organisation verifizierter Quellen.
- Aufruf nach jeder Änderung an Fall, Person oder Quelle (Service-Layer).
- Abfrage: Präfix-Tsquery aus bereinigten Tokens (`hag:* & innen:*`), Ranking `ts_rank`.

## 5. Integritätsregeln (Datenbankebene)

| Regel | Umsetzung |
|---|---|
| Koordinaten gültig | CHECK-Constraints |
| Keine adressgenauen Orte | CHECK `precision_m >= 100` |
| Veröffentlicht ⇒ Datum | CHECK `cases_published_at` |
| Audit-Log unveränderlich | Trigger `audit_logs_no_update` |
| Person nicht löschbar, solange Fall existiert | FK `ON DELETE RESTRICT` |

Anwendungsregeln (Service-Layer, getestet): Veröffentlichung nur mit verifizierter Quelle,
Minderjährige nur mit behördlicher Quelle, Statusübergänge gemäß Workflow.

## 6. Migrationen & Seed

```bash
npm run db:migrate        # prisma migrate deploy (Produktion/CI)
npm run db:migrate:dev    # neue Migration entwickeln
npm run db:seed           # DEMO DATA (fiktive Personen) + Demo-Benutzer
```

Die Migration `*_init` enthält manuelle Ergänzungen (GENERATED-Spalte, Constraints,
Suchfunktion, Audit-Trigger). Prisma kennt die Indizes (`@@index(..., type: Gist/Gin)`) und
den Generated-Ausdruck, sodass `migrate dev` keinen Drift erkennt.

## 7. Löschung & Aufbewahrung

- `npm run retention` löscht Kontaktdaten und IP-Hashes abgeschlossener Hinweise/Meldungen nach
  `RETENTION_DAYS` (Default 180) und entfernt veraltete Sessions und Rate-Limit-Einträge.
- Administratoren können personenbezogene Daten eines Hinweises/einer Meldung sofort löschen
  (`personal_data_erased_at` wird gesetzt, Audit-Eintrag ohne Inhalte).
- Fälle werden nicht physisch gelöscht, sondern ARCHIVED (nicht öffentlich).
