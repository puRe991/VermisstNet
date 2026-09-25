# VermisstAtlas – API

Alle Endpunkte liegen unter `/api`, sprechen JSON (Uploads: `multipart/form-data`) und sind als
Next.js Route Handler in `src/app/api/**/route.ts` implementiert. Jeder Handler folgt dem Muster
**Parse (Zod) → Actor ermitteln → Service (Autorisierung + Audit) → DTO**.

## Konventionen

- **Authentifizierung:** Session-Cookie `va_session` (HttpOnly, Secure in Produktion,
  SameSite=Lax). Kein Bearer-Token im MVP.
- **CSRF:** Alle nicht-lesenden Anfragen (`POST/PATCH/PUT/DELETE`) müssen einen `Origin`-Header
  der eigenen Domain tragen (Middleware), sonst `403`.
- **Fehlerformat:**
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { "field": ["…"] } } }
  ```
  Codes: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND`
  (404), `CONFLICT` (409), `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_MEDIA_TYPE` (415),
  `RATE_LIMITED` (429, Header `Retry-After`), `INTERNAL_ERROR` (500, ohne Details).
- **Nicht gefunden vs. verboten:** Für nicht öffentliche Fälle antworten öffentliche Endpunkte
  mit `404` (keine Existenzbestätigung).
- **Pagination:** `?page=1&pageSize=20` (max. 50) → `{ items, page, pageSize, total, totalPages }`.
- **IDs:** Öffentliche Fall-Endpunkte akzeptieren die Fallnummer (`VA-2026-000001`), interne
  Endpunkte die UUID.
- **Caching:** Öffentliche Lese-Endpunkte senden `Cache-Control: public, s-maxage=60,
  stale-while-revalidate=300`; alle anderen `no-store`.

---

## Öffentliche Endpunkte

### `GET /api/cases`
Suche & Filter über veröffentlichte Fälle.

| Parameter | Beschreibung |
|---|---|
| `q` | Volltext (Name, Ort, Fallnummer, Beschreibung, Quellen) |
| `status` | `ACTIVE`, `FOUND`, `CLOSED` (mehrfach möglich, Default `ACTIVE`) |
| `gender` | `FEMALE`, `MALE`, `DIVERSE`, `UNKNOWN` |
| `ageMin`, `ageMax` | Alter in Jahren |
| `state` | Bundesland (`DE-NW`) |
| `city` | Ort |
| `since`, `until` | Vermisst seit (Zeitraum, ISO-Datum) |
| `sourceType` | Typ einer verifizierten Quelle (`POLICE`, …) |
| `urgent` | `true` → nur dringliche |
| `page`, `pageSize` | Pagination |

Antwort: `{ items: PublicCaseSummary[], page, pageSize, total, totalPages }`

```ts
type PublicCaseSummary = {
  publicNumber: string; displayName: string; headline: string; age: number | null;
  gender: Gender; status: 'ACTIVE' | 'FOUND' | 'CLOSED'; isUrgent: boolean;
  missingSince: string; place: string; federalState: string | null;
  primaryImage: { id: string; url: string; thumbUrl: string; alt: string } | null;
  isDemo: boolean;
};
```

### `GET /api/cases/:publicNumber`
Öffentliche Fallansicht (`PublicCaseDetail`): Zusammenfassung + Personenbeschreibung,
Umstände, Bekleidung, zuständige Stelle, öffentliche Chronologie, öffentliche (generalisierte)
Orte, verifizierte Quellen, freigegebene Bilder, `lastVerifiedAt`. Für FOUND/CLOSED reduziert
(keine Bilder, Beschreibung, Orte). `404` für nicht veröffentlichte/archivierte Fälle.

### `GET /api/cases/:publicNumber/timeline`
Öffentliche Timeline-Ereignisse `{ items: { type, occurredAt, description, source } [] }`.

### `GET /api/cases/:publicNumber/geo-analysis`
Automatisch berechnete Zusammenhänge zwischen öffentlichen Orten:
```json
{
  "computed": true,
  "label": "Automatisch berechnet / nicht bestätigt",
  "disclaimer": "…keine Aussage über den tatsächlichen Aufenthaltsort…",
  "segments": [{ "from": "Hagen", "to": "Dortmund", "distanceKm": 21.4, "hoursBetween": 5.5 }],
  "totalDistanceKm": 21.4
}
```

### `POST /api/cases/submissions`
Neue Vermisstenmeldung (`multipart/form-data` oder JSON). Felder: `personName`, `age`,
`gender`, `missingSince`, `missingPlace`, `description`, `circumstances`, `sourceText`,
`sourceUrl`, `contact`, `image` (optional, JPG/PNG/WebP ≤ 8 MB), `consent` (Pflicht),
`website` (Honeypot, muss leer sein). Antwort `201 { referenceCode, status: "SUBMITTED" }`.
Rate Limit: 5 / Stunde / IP.

### `POST /api/cases/:publicNumber/hints`
Hinweis zu einem veröffentlichten, aktiven Fall. Felder: `hintType`, `observedDate`,
`observedTime`, `locationText`, `latitude`, `longitude`, `description`, `isAnonymous`,
`contact`, `attachments[]` (max. 3; JPG/PNG/WebP ≤ 8 MB, MP4/WebM ≤ 25 MB), `consent`,
`website` (Honeypot). Antwort `201 { referenceCode, status: "NEW" }`. Rate Limit: 10 / Stunde / IP.
Hinweise werden **nie** veröffentlicht.

### `POST /api/cases/:publicNumber/reports`
Inhalt melden: `reason`, `message`, `contact?`. Rate Limit 10 / Stunde / IP.

### `GET /api/map/cases`
Kartenmarker. Parameter: `bbox=minLng,minLat,maxLng,maxLat` (optional) sowie dieselben Filter
wie `/api/cases` (`status`, `gender`, `ageMin`, `ageMax`, `state`, `since`, `until`,
`sourceType`). Liefert maximal 2000 Marker:
```ts
{ items: { publicNumber, displayName, age, place, missingSince, status, isUrgent,
           lat, lng, precisionM, thumbUrl }[], truncated: boolean }
```
Koordinaten sind serverseitig generalisiert (Raster ≈ 1,1 km, Minderjährige ≈ 2,2 km).
Nur Fälle mit Status ACTIVE und öffentlichem Ort (`MISSING_LOCATION`/`LAST_KNOWN_LOCATION`).

### `GET /api/sources?case=VA-…`
Verifizierte Quellen eines veröffentlichten Falls (`type, organization, title, url,
publicationDate, verifiedAt`). Ohne `case`-Parameter: `400`.

### `GET /api/media/:id/file?variant=full|thumb`
Liefert ein Bild. Öffentlich nur, wenn freigegeben, `PUBLIC`, Urheberrecht geklärt und Fall
veröffentlicht + ACTIVE. Moderatoren+ erhalten auch interne Dateien (inkl. Hinweis-Anhängen)
mit `Cache-Control: private, no-store`. Header `X-Content-Type-Options: nosniff`,
`Content-Security-Policy: default-src 'none'`.

---

## Authentifizierung & Konto

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/auth/register` | `{ email, displayName, password }` → Rolle reporter, meldet an. Rate Limit 5/h |
| POST | `/api/auth/login` | `{ email, password }` → setzt Cookie. Rate Limit 10 / 15 min / IP |
| POST | `/api/auth/logout` | löscht Session |
| GET | `/api/auth/me` | `{ user: { id, email, displayName, role } \| null }` |
| GET | `/api/me/submissions` | eigene Meldungen (Status, Referenz) – reporter+ |
| GET | `/api/me/hints` | eigene Hinweise (Status, Referenz) – reporter+ |

---

## Interne Endpunkte (`/api/admin/**`)

Alle erfordern eine Session; Mindestrolle in Klammern. Alle Änderungen erzeugen Audit-Einträge.

### Dashboard
| Methode | Pfad | |
|---|---|---|
| GET | `/api/admin/dashboard` | Zähler + Listen: neue Hinweise, neue Meldungen, ungeprüfte Quellen, gemeldete Inhalte, zuletzt bearbeitete Fälle, offene Aufgaben (moderator) |

### Hinweise
| Methode | Pfad | |
|---|---|---|
| GET | `/api/admin/hints?status=&case=&page=` | Liste (moderator) |
| GET | `/api/admin/hints/:id` | Detail inkl. entschlüsseltem Kontakt, Originaleingabe, Anhängen, Verlauf (moderator; Zugriff wird protokolliert) |
| PATCH | `/api/admin/hints/:id` | `{ decision: CONFIRM\|DEFER\|REQUEST_INFO\|REJECT\|FORWARD\|ARCHIVE\|NOTE, note?, assignToMe? }` (moderator) |
| POST | `/api/admin/hints/:id/erase` | personenbezogene Daten löschen (administrator) |

### Fallmeldungen
| Methode | Pfad | |
|---|---|---|
| GET | `/api/admin/submissions?status=&page=` | Liste (moderator) |
| GET | `/api/admin/submissions/:id` | Detail (moderator) |
| PATCH | `/api/admin/submissions/:id` | `{ decision, note? }`; CONFIRM bei SOURCE_VERIFICATION → APPROVED + Fallentwurf (moderator) |
| POST | `/api/admin/submissions/:id/erase` | personenbezogene Daten löschen (administrator) |

### Fälle
| Methode | Pfad | |
|---|---|---|
| GET | `/api/admin/cases?q=&status=&publication=&page=` | Liste inkl. Entwürfe (moderator) |
| POST | `/api/admin/cases` | Fall + Person anlegen (DRAFT) (editor) |
| GET | `/api/admin/cases/:id` | interne Vollansicht (moderator) |
| PATCH | `/api/admin/cases/:id` | Felder von Fall/Person, `status`, `isUrgent` (editor). Statuswechsel erzeugt Timeline-Ereignis `STATUS_CHANGE`/`FOUND` |
| POST | `/api/admin/cases/:id/publish` | veröffentlichen (editor; Pflichtprüfungen, sonst `409`) |
| POST | `/api/admin/cases/:id/unpublish` | zurückziehen (editor) |

### Orte, Quellen, Chronologie
| Methode | Pfad | |
|---|---|---|
| POST | `/api/admin/cases/:id/locations` | Ort anlegen (editor) |
| PATCH / DELETE | `/api/admin/locations/:id` | (editor) |
| POST | `/api/admin/cases/:id/sources` | Quelle anlegen (moderator) |
| GET | `/api/admin/sources?verified=false` | zu prüfende Quellen (moderator) |
| PATCH / DELETE | `/api/admin/sources/:id` | bearbeiten / löschen (moderator / editor) |
| POST | `/api/admin/sources/:id/verify` | `{ verified: boolean, note? }` (moderator) |
| POST | `/api/admin/cases/:id/timeline` | Ereignis anlegen (moderator) |
| PATCH / DELETE | `/api/admin/timeline/:id` | (moderator / editor) |

### Medien
| Methode | Pfad | |
|---|---|---|
| POST | `/api/media` | Upload (`multipart`: `file`, `caseId`, `title`, `sourceText`, `copyrightStatus`, `mediaType`) (editor). Datei ist zunächst PENDING + INTERNAL |
| PATCH | `/api/admin/media/:id` | `{ reviewStatus, visibility, isPrimary, title, sourceText, copyrightStatus }` (editor) |
| DELETE | `/api/admin/media/:id` | löscht Datei + Datensatz (editor) |

### Gemeldete Inhalte
| Methode | Pfad | |
|---|---|---|
| GET | `/api/admin/reports?status=` | (moderator) |
| PATCH | `/api/admin/reports/:id` | `{ decision, note? }` (moderator) |

### Benutzer & Audit
| Methode | Pfad | |
|---|---|---|
| GET | `/api/admin/users` | (administrator) |
| POST | `/api/admin/users` | `{ email, displayName, password, role }` (administrator) |
| PATCH | `/api/admin/users/:id` | `{ role?, isActive?, displayName? }` (administrator; letzter aktiver Admin geschützt; Rollenänderung beendet Sessions) |
| GET | `/api/admin/audit?entityType=&entityId=&actor=&page=` | (administrator) |
