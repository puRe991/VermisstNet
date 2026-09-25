# VermisstAtlas – Architektur

> Stand: Phase 0 (Analyse) + MVP-Implementierung. Dieses Dokument beschreibt Anforderungen,
> Risiken, Architekturentscheidungen, Seitenstruktur sowie Rollen & Berechtigungen.
> Ergänzende Dokumente: [DATABASE.md](./DATABASE.md), [API.md](./API.md),
> [SECURITY.md](./SECURITY.md), [ROADMAP.md](./ROADMAP.md), [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 1. Anforderungsanalyse

VermisstAtlas ist eine Plattform zur **strukturierten, verifizierten** Darstellung von
Vermisstenfällen. Kern ist nicht die Veröffentlichung, sondern die **kontrollierte**
Veröffentlichung: Alles, was von außen kommt (Hinweise, Fallmeldungen, Bilder), landet
zuerst in einem internen Prüfprozess.

| Bereich | Kernanforderung | Umsetzung (MVP) |
|---|---|---|
| Fälle | strukturiert speichern, Status ACTIVE/FOUND/CLOSED/ARCHIVED, URGENT | `Case` + `Person`, `isUrgent` nur editor+ |
| Veröffentlichung | nichts automatisch öffentlich | `publicationStatus` DRAFT/PUBLISHED/UNPUBLISHED, Veröffentlichung nur editor+, nur mit verifizierter Quelle |
| Meldungen | Workflow SUBMITTED→REVIEW→SOURCE_VERIFICATION→APPROVED→PUBLISHED / REJECTED | `CaseSubmission` mit Zustandsautomat (`src/lib/workflow.ts`) |
| Hinweise | nie öffentlich, eigener Statusworkflow | `Hint`, kein öffentlicher Lesepfad, Kontaktdaten verschlüsselt |
| Quellen | jede wesentliche Information belegbar | `Source`, Verknüpfung an Timeline, Location, Media |
| Medien | Suchbilder, serverseitige Prüfung, Freigabe | `Media`, Magic-Byte-Prüfung, Re-Encoding (EXIF-Entfernung), Freigabe-Status |
| Karte | Marker, Cluster, Filter, keine präzisen Privatdaten | Leaflet + OSM, Marker-Clustering, Koordinaten-Generalisierung serverseitig |
| Chronologie | Ereignistypen, Sichtbarkeit | `TimelineEvent` mit `visibility` |
| Geo-Analyse | Entfernungen/Abfolge, klar als „nicht bestätigt“ | PostGIS `ST_Distance`, Kennzeichnung `computed: true` |
| Moderation | Dashboard, Verlauf, Entscheidungen | `/admin`, `ReviewEvent`, Entscheidungen CONFIRM/DEFER/REQUEST_INFO/REJECT/FORWARD |
| Audit | jede administrative Änderung | `AuditLog` (append-only, DB-Trigger) |
| Suche | Volltext + Filter | PostgreSQL `tsvector` (nur öffentliche Felder) + GIN-Index |
| Datenschutz | Minimierung, Rollen, Trennung öffentlich/intern | DTO-Allowlist, Rollenmatrix, Verschlüsselung, Retention-Skript |

### 1.1 Nicht-Ziele des MVP

- Keine Social-Features (Likes, Rankings, Kommentare, „beliebteste Fälle“).
- Keine automatische Übernahme von Fällen aus externen Quellen (Crawler).
- Keine E-Mail-Benachrichtigungen (vorbereitet, siehe Roadmap).
- Keine Veröffentlichung von Hinweisen – auch nicht „verifizierter“ Hinweise. Verifizierte
  Informationen werden von Redakteuren **als eigene Timeline-Ereignisse mit Quelle** erfasst.

---

## 2. Technische Risiken

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| **Versehentliche Veröffentlichung interner Daten** (API, SSR, Suchindex) | sehr hoch (Persönlichkeitsrechte, Gefährdung) | Öffentliche Ausgaben ausschließlich über Allowlist-DTOs (`src/server/dto/public.ts`); Suchvektor wird per SQL-Funktion nur aus öffentlichen Feldern gebaut; Tests prüfen, dass interne Felder nie in öffentlichen Antworten vorkommen |
| Falsche/unbelegte Fälle, Trollmeldungen | hoch | Kein Auto-Publish; Veröffentlichung erfordert verifizierte Quelle; Minderjährige nur mit behördlicher Quelle |
| Präzise Ortsangaben (Wohnadresse) | hoch | Keine Adressfelder; Mindestgenauigkeit 100 m (DB-Constraint); öffentliche Koordinaten werden auf Raster generalisiert (≈1 km, bei Minderjährigen ≈2 km); Adressmuster-Erkennung in öffentlichen Formularen |
| Metadaten in Bildern (GPS-EXIF) | hoch | Alle Bilder werden mit `sharp` neu kodiert (WebP), Metadaten verworfen |
| Upload-Manipulation (Polyglots, falsche MIME-Types) | mittel | Magic-Byte-Prüfung, Größenlimits, Dekodierung durch `sharp`, Ablage außerhalb von `public/`, Auslieferung nur über geprüfte Route mit `nosniff` |
| Missbrauch der offenen Formulare (Spam) | mittel | DB-gestütztes Rate Limiting pro IP-HMAC, Honeypot-Feld, Größenlimits |
| Prisma unterstützt PostGIS nicht nativ | mittel (Wartbarkeit) | `lat/lng` als normale Spalten (Prisma), `geom` als GENERATED-Spalte; Geo-Abfragen als parametrisierte `$queryRaw`-Tagged-Templates |
| Skalierung Karte (viele Marker) | mittel | BBox-Abfragen mit GiST-Index, Client-Clustering, Limit pro Anfrage |
| OSM-Tile-Usage-Policy | mittel (Produktion) | Tile-URL konfigurierbar (`NEXT_PUBLIC_TILE_URL`), Doku für eigenen Tile-Server |
| Multi-Instanz-Betrieb (Rate Limit, Sessions, Dateien) | mittel | Sessions und Rate Limits in PostgreSQL; Storage hinter Interface (lokal → S3-kompatibel austauschbar) |
| Rechtliche Anforderungen (DSGVO, KUG/Bildrechte) | hoch | `copyrightStatus` UNKNOWN blockiert Veröffentlichung; Lösch-/Retention-Mechanismus; Impressum/Datenschutz-Seiten vorbereitet (juristische Prüfung erforderlich) |

---

## 3. Architekturüberblick

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Browser (mobile first)                                                    │
│  Server Components (SSR)   Client Components (Formulare, Karte, Admin)    │
└───────────────┬───────────────────────────────┬──────────────────────────┘
                │ HTML (SSR)                    │ fetch JSON / multipart
┌───────────────▼───────────────────────────────▼──────────────────────────┐
│ Next.js (App Router, Node.js Runtime)                                     │
│  middleware.ts  → Security-Header (CSP mit Nonce), Origin-Prüfung (CSRF)  │
│  app/(public)/… → öffentliche Seiten      app/admin/… → Moderation        │
│  app/api/…      → Route Handler (dünn: Parse → Auth → Service → DTO)      │
├──────────────────────────────────────────────────────────────────────────┤
│ src/server  (nur serverseitig, `server-only`)                             │
│  auth/        Sessions, Passwort-Hashing, Rollenprüfung                   │
│  services/    Geschäftslogik + Autorisierung + Audit (eine Stelle!)       │
│  dto/         Allowlist-Mapper öffentlich / intern                        │
│  storage/     Datei-Ablage (Interface, lokaler Treiber)                   │
│  security/    Rate Limiting, Verschlüsselung, IP-HMAC                     │
│  geo/         PostGIS-Abfragen, Generalisierung                           │
├──────────────────────────────────────────────────────────────────────────┤
│ src/lib  (isomorph)  Zod-Schemas, Rollenmatrix, Workflows, Labels          │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ Prisma (parametrisiert) + $queryRaw (Tagged Templates)
┌───────────────▼──────────────────────────────────────────────────────────┐
│ PostgreSQL 16 + PostGIS 3  (tsvector/GIN, geography/GiST, Audit-Trigger)  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Architekturentscheidungen (ADR-Kurzform)

1. **Next.js App Router als Monolith.** Frontend und API in einem Deployment – für den MVP
   am wartbarsten. Die Geschäftslogik liegt vollständig in `src/server/services` und ist
   frameworkunabhängig; ein späteres Herauslösen der API ist ohne Neuschreiben möglich.
2. **Service-Layer als einzige Autorisierungsstelle.** Jeder Service erhält einen `Actor`
   (anonymer Besucher oder angemeldeter Benutzer) und prüft Berechtigungen selbst. Route
   Handler und Server Components rufen nur Services auf. Dadurch gibt es keinen zweiten,
   ungeprüften Datenpfad.
3. **Allowlist-DTOs statt „Felder entfernen“.** Öffentliche Antworten werden explizit
   feldweise aufgebaut. Neue Datenbankfelder sind damit standardmäßig *nicht* öffentlich.
4. **Eigene Session-Authentifizierung** (statt Auth-Bibliothek): DB-Sessions, zufälliges
   256-bit-Token im `HttpOnly`/`Secure`/`SameSite=Lax`-Cookie, in der DB nur als SHA-256-Hash;
   Passwörter mit Argon2id. Transparent, testbar, ohne Beta-Abhängigkeiten. Rollen werden bei
   jeder Anfrage aus der DB gelesen (sofortiger Entzug möglich).
5. **Prisma + GENERATED PostGIS-Spalte.** Prisma schreibt `latitude/longitude`; PostgreSQL
   berechnet `geom` automatisch. Kein Raw-SQL für Schreibzugriffe nötig, Geo-Abfragen per
   parametrisiertem `$queryRaw`.
6. **Volltextsuche in PostgreSQL** (`tsvector`, Konfiguration `simple`, Präfixsuche) statt
   externer Suchmaschine. Der Index wird ausschließlich per SQL-Funktion
   `refresh_case_search()` aus öffentlichen Feldern gebaut – nicht veröffentlichte Fälle haben
   keinen Suchvektor.
7. **Rate Limiting in PostgreSQL** (Fixed Window), damit es auch bei mehreren Instanzen
   korrekt funktioniert. Austauschbar gegen Redis.
8. **Datei-Ablage hinter Interface** (`StorageDriver`), lokal im Dateisystem außerhalb von
   `public/`. Auslieferung ausschließlich über `/api/media/:id/file` mit Berechtigungsprüfung.
9. **Karten-Generalisierung serverseitig.** Der Client erhält nie genauere Koordinaten als
   erlaubt; Generalisierung ist nicht umgehbar durch Client-Code.
10. **Mobile first, Tailwind CSS v3.4**, ruhige Farbgebung, keine sensationsorientierten Elemente.
11. **Breite Browser-Kompatibilität:** Tailwind v3 statt v4 und `browserslist`-Ziele, damit auch
    ältere Windows-Systeme (Windows 7/8.1, 32 Bit) mit Chrome/Edge 109 bzw. Firefox ESR 115
    vollständig funktionieren (getestet). Details: [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 4. Seitenstruktur

### Öffentlich

| Pfad | Inhalt | Rendering |
|---|---|---|
| `/` | Header, Hero mit großer Suche, Buttons „Vermisstenfälle ansehen“ / „Hinweis melden“, neueste aktive Fälle (chronologisch), Erläuterung | SSR |
| `/faelle` | Liste mit Volltextsuche, Filtern (Alter, Geschlecht, Bundesland, Ort, Status, Zeitraum, Quelle), Pagination | SSR (Query-Parameter) |
| `/faelle/[fallnummer]` | Fallseite: Suchbild, Eckdaten, Personenbeschreibung, bekannte Informationen, Chronologie, Karte, Geo-Analyse (gekennzeichnet), Quellen, Button „Hinweis zu diesem Fall melden“, „Inhalt melden“ | SSR |
| `/faelle/[fallnummer]/hinweis` | Hinweisformular für einen Fall | SSR + Client-Formular |
| `/karte` | Vollbildkarte mit Filtern, Clustering, Popups | Client (Leaflet) |
| `/hinweis` | Hinweis melden: Fall auswählen/suchen → Formular | SSR + Client |
| `/melden` | Neue Vermisstenmeldung | Client-Formular |
| `/ueber` | Über das Projekt, Grundsätze | statisch |
| `/datenschutz`, `/impressum` | Rechtstexte (Platzhalter, juristisch zu prüfen) | statisch |
| `/anmelden`, `/registrieren` | Login / Registrierung (Rolle reporter) | Client-Formular |
| `/konto` | Eigene Meldungen und Hinweise mit Status | SSR (angemeldet) |

### Intern (`/admin`, ab Rolle moderator)

| Pfad | Inhalt | Mindestrolle |
|---|---|---|
| `/admin` | Dashboard: neue Hinweise, neue Fallmeldungen, zu prüfende Quellen, gemeldete Inhalte, zuletzt bearbeitete Fälle, offene Aufgaben | moderator |
| `/admin/hinweise`, `/admin/hinweise/[id]` | Hinweisliste/-detail: Originaleingabe, Zeitpunkt, Kontakt (entschlüsselt), Anhänge, Verlauf, Entscheidungen | moderator |
| `/admin/meldungen`, `/admin/meldungen/[id]` | Fallmeldungen im Workflow, Übernahme als Fallentwurf | moderator |
| `/admin/faelle`, `/admin/faelle/neu`, `/admin/faelle/[id]` | Fallverwaltung: Person, Fall, Status, Orte, Quellen, Medien, Chronologie, Veröffentlichung | moderator (lesen/Teilbereiche), editor (voll) |
| `/admin/quellen` | Zu prüfende Quellen | moderator |
| `/admin/inhalte` | Gemeldete Inhalte | moderator |
| `/admin/benutzer` | Benutzer & Rollen | administrator |
| `/admin/audit` | Audit-Log | administrator |

---

## 5. Rollen & Berechtigungen

Rollen sind hierarchisch: `visitor < reporter < moderator < editor < administrator`.
Die maßgebliche Definition ist `src/lib/permissions.ts` (durch Tests abgesichert).

| Berechtigung | visitor | reporter | moderator | editor | admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Veröffentlichte Fälle lesen, suchen, Karte | ✔ | ✔ | ✔ | ✔ | ✔ |
| Hinweis einreichen (auch anonym) | ✔ | ✔ | ✔ | ✔ | ✔ |
| Vermisstenfall melden | ✔ | ✔ | ✔ | ✔ | ✔ |
| Inhalt melden | ✔ | ✔ | ✔ | ✔ | ✔ |
| Eigene Meldungen/Hinweise + Status einsehen | – | ✔ | ✔ | ✔ | ✔ |
| Interne Fallansicht (Entwürfe, interne Felder) | – | – | ✔ | ✔ | ✔ |
| Hinweise lesen & moderieren (inkl. Kontaktdaten) | – | – | ✔ | ✔ | ✔ |
| Fallmeldungen moderieren (bis APPROVED) | – | – | ✔ | ✔ | ✔ |
| Quellen anlegen / verifizieren | – | – | ✔ | ✔ | ✔ |
| Timeline-Ereignisse anlegen | – | – | ✔ | ✔ | ✔ |
| Gemeldete Inhalte bearbeiten | – | – | ✔ | ✔ | ✔ |
| Fälle anlegen / bearbeiten, Orte, Medien freigeben | – | – | – | ✔ | ✔ |
| Fall veröffentlichen / zurückziehen | – | – | – | ✔ | ✔ |
| Status ändern (FOUND/CLOSED/ARCHIVED), URGENT setzen | – | – | – | ✔ | ✔ |
| Personenbezogene Daten löschen (Hinweis/Meldung) | – | – | – | – | ✔ |
| Benutzer & Rollen verwalten | – | – | – | – | ✔ |
| Audit-Log einsehen | – | – | – | – | ✔ |

„visitor“ ist sowohl der nicht angemeldete Besucher als auch ein Konto mit Rolle VISITOR
(z. B. gesperrte Rechte). Die Selbstregistrierung erzeugt die Rolle **reporter**; höhere
Rollen vergibt nur ein Administrator (niemals an sich selbst herabstufbar → letzter Admin
geschützt).

---

## 6. Fachliche Workflows

### 6.1 Neue Vermisstenmeldung

```
SUBMITTED ──► REVIEW ──► SOURCE_VERIFICATION ──► APPROVED ──► PUBLISHED
    │            │               │                   │
    └────────────┴───────────────┴──────► REJECTED ◄─┘
```

- Öffentliches Formular erzeugt `CaseSubmission` (Status SUBMITTED). **Kein** Fall entsteht.
- Moderator: CONFIRM bewegt einen Schritt weiter; DEFER/REQUEST_INFO/FORWARD ändern den Status
  nicht, werden aber als Entscheidung protokolliert; REJECT → REJECTED.
- Bei APPROVED legt das System einen **Fallentwurf** (DRAFT) an – inkl. Person, Quelle
  (unverifiziert, Typ aus Meldung) und ggf. Suchbild (PENDING/INTERNAL).
- Erst die Veröffentlichung des Falls durch einen Editor setzt die Meldung auf PUBLISHED.

### 6.2 Fallveröffentlichung (Pflichtprüfungen)

Ein Fall kann nur veröffentlicht werden, wenn:
1. mindestens eine **verifizierte Quelle** existiert,
2. bei **Minderjährigen** mindestens eine verifizierte Quelle vom Typ `POLICE` oder
   `OFFICIAL_AUTHORITY` existiert,
3. der Fall nicht ARCHIVED ist.

Bilder werden nur angezeigt, wenn `reviewStatus = APPROVED`, `visibility = PUBLIC` und
`copyrightStatus ≠ UNKNOWN`.

### 6.3 Status & Sichtbarkeit

| Status | Öffentliche Darstellung |
|---|---|
| ACTIVE (+ optional URGENT) | vollständige öffentliche Fallseite, Karte |
| FOUND | Hinweis „Die Person wurde gefunden“, **keine Bilder, keine Beschreibung, keine Karte**; Name gemäß Sichtbarkeitsstufe |
| CLOSED | wie FOUND, Text „Fall abgeschlossen“ |
| ARCHIVED | **nicht öffentlich** (404) |

### 6.4 Hinweise

`NEW → UNDER_REVIEW → (REQUIRES_INFORMATION) → VERIFIED | REJECTED | FORWARDED → ARCHIVED`.
Hinweise sind **ausschließlich intern**. Es gibt keine öffentliche Leseroute. Entscheidungen
bestätigen/zurückstellen/Rückfrage/ablehnen/intern weiterleiten werden auf Status abgebildet
(siehe `src/lib/workflow.ts`) und im `ReviewEvent`-Verlauf gespeichert.

### 6.5 Automatische Geo-Informationen

`GET /api/cases/:id/geo-analysis` berechnet mit PostGIS Entfernungen und zeitliche Abfolge
zwischen **öffentlichen** Orten eines Falls. Jede Ausgabe trägt `computed: true` und das Label
**„Automatisch berechnet / nicht bestätigt“**. Die Software trifft keine Aussage über den
tatsächlichen Aufenthaltsort; es gibt keine Extrapolation/Prognose.

---

## 7. Verzeichnisstruktur

```
prisma/                 schema.prisma, migrations/, seed.ts (DEMO DATA)
src/app/                Next.js App Router (Seiten + API Route Handler)
src/components/         UI-Komponenten (public/, admin/, map/, ui/)
src/lib/                isomorpher Code: validation/, permissions.ts, workflow.ts, labels.ts
src/server/             serverseitiger Code: auth/, services/, dto/, storage/, security/, geo/
src/middleware.ts       Security-Header, CSRF-Origin-Prüfung
scripts/                create-user.ts, retention.ts
tests/                  Vitest: unit/ und integration/ (gegen Test-Datenbank)
docs/                   Dokumentation
```
