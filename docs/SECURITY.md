# VermisstAtlas – Sicherheit & Datenschutz

Leitfrage für jede Änderung: **„Kann ein normaler Besucher hier interne Daten abrufen?“**

Priorität bei Zielkonflikten: Sicherheit → Datenschutz → Datenintegrität → Wartbarkeit →
Benutzerfreundlichkeit → Performance → Optik.

## 1. Schutzbedarf

| Datenkategorie | Schutzbedarf | Beispiele |
|---|---|---|
| Öffentliche Falldaten | mittel (Integrität!) | Name gem. Sichtbarkeitsstufe, Alter, Ort, Beschreibung |
| Interne Falldaten | hoch | Aktenzeichen, interne Notizen, Geburtsdatum, Entwürfe |
| Hinweise | sehr hoch | Beobachtungen, Hinweisgeber-Kontakt, Anhänge |
| Fallmeldungen | sehr hoch | ungeprüfte Angaben, Kontakt der meldenden Person |
| Konten | hoch | E-Mail, Passwort-Hash, Sessions |
| Audit-Log | hoch (Integrität) | Änderungen inkl. Altwerten |

Besonderer Schutz: **Minderjährige** (Veröffentlichung nur mit behördlicher Quelle, gröbere
Kartengeneralisierung, Default-Sichtbarkeit „Vorname + Initial“).

## 2. Maßnahmen

### 2.1 Trennung öffentlich / intern
- Öffentliche Antworten werden **ausschließlich** über Allowlist-Mapper
  (`src/server/dto/public.ts`) erzeugt. Neue Felder sind standardmäßig intern.
- Öffentliche Services filtern in der **Datenbankabfrage** auf
  `publication_status = 'PUBLISHED' AND status <> 'ARCHIVED'` (nicht nachträglich im Code).
- Öffentliche Timeline/Orte/Quellen/Medien: nur `visibility = PUBLIC` bzw. verifiziert/freigegeben.
- Suchindex (`search_vector`) wird per SQL-Funktion nur aus öffentlichen Feldern befüllt und
  ist für nicht veröffentlichte Fälle `NULL`.
- Hinweise besitzen **keinen** öffentlichen Lesepfad.
- Tests (`tests/integration/public-leak.test.ts`) prüfen, dass interne Marker-Strings
  (z. B. interne Notizen) in keiner öffentlichen Antwort auftauchen.

### 2.2 Authentifizierung & Sessions
- Passwörter: **Argon2id** (m = 19 MiB, t = 2, p = 1; OWASP-Empfehlung), Mindestlänge 10 Zeichen.
- Session-Token: 32 Byte aus CSPRNG, im Cookie `va_session` (`HttpOnly`, `Secure` in Produktion,
  `SameSite=Lax`, `Path=/`), in der DB nur als SHA-256-Hash. Ablauf nach `SESSION_TTL_HOURS`
  (Default 12 h), Sliding-Refresh.
- Rolle und `is_active` werden bei **jeder** Anfrage aus der DB gelesen; Deaktivierung oder
  Rollenänderung beendet alle Sessions des Benutzers.
- Login-Fehler sind generisch („E-Mail oder Passwort falsch“); Zeitverhalten wird durch
  Dummy-Hash-Verifikation bei unbekannter E-Mail angeglichen.
- Rate Limiting auf Login/Registrierung.

### 2.3 Autorisierung
- Rollenmatrix in `src/lib/permissions.ts`; Prüfung im Service-Layer (`requirePermission`).
- Middleware schützt `/admin` zusätzlich (Defense in Depth), maßgeblich bleibt der Service.
- **IDOR:** Interne Objekte werden über UUIDs adressiert *und* jede Abfrage prüft die Rolle.
  Reporter sehen nur Objekte mit `reporter_id = eigene ID`.
- Öffentliche Endpunkte liefern für nicht öffentliche Objekte `404` (keine Existenzbestätigung).
- URGENT, Statusänderungen und Veröffentlichung nur editor+; Rollenverwaltung nur Administrator;
  der letzte aktive Administrator kann nicht herabgestuft/deaktiviert werden.

### 2.4 CSRF
- Session-Cookie `SameSite=Lax`.
- Middleware prüft für alle mutierenden `/api`-Anfragen, dass `Origin` (bzw. `Referer`) zur
  eigenen Origin (`APP_URL` bzw. Host) passt → sonst `403`.
- Keine zustandsändernden `GET`-Endpunkte.

### 2.5 XSS
- React escaped alle Ausgaben; `dangerouslySetInnerHTML` wird nicht verwendet (ESLint-Regel).
- Karten-Popups werden als React-Komponenten gerendert (kein HTML-String).
- Strikte **Content-Security-Policy** mit Nonce für Skripte (`script-src 'self' 'nonce-…'
  'strict-dynamic'`), `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`.
- Eingaben werden serverseitig normalisiert (Steuerzeichen entfernt, Längenlimits).
- URLs in Quellen nur `http:`/`https:` (verhindert `javascript:`-Links).

### 2.6 SQL-Injection
- Prisma (parametrisiert). Raw-SQL ausschließlich als `$queryRaw` Tagged Template
  (automatische Parametrisierung); kein `$queryRawUnsafe`.
- Volltext-Tokens werden auf `[\p{L}\p{N}-]` reduziert, bevor sie in `to_tsquery` gelangen.

### 2.7 Uploads
- Erlaubt: JPG/JPEG, PNG, WebP (Bilder); MP4/WebM nur als interne Hinweis-Anhänge.
- Prüfung per **Magic Bytes** (nicht Dateiendung/Client-MIME), Größenlimits (Bild 8 MB,
  Video 25 MB), Pixel-Limit (40 MP) gegen Decompression Bombs.
- Bilder werden mit `sharp` dekodiert und **neu kodiert** (WebP, max. 2000 px) → EXIF/GPS und
  eingebettete Nutzlasten werden verworfen; zusätzlich Thumbnail.
- Ablage außerhalb von `public/` unter zufälligem Schlüssel; Auslieferung nur über
  `/api/media/:id/file` mit Berechtigungsprüfung, `nosniff`, `Content-Security-Policy:
  default-src 'none'`, festem `Content-Type`.
- Neue Medien sind `PENDING` + `INTERNAL`; Veröffentlichung nur nach Freigabe durch editor und
  mit geklärtem Urheberrecht.

### 2.8 Rate Limiting & Missbrauch
- PostgreSQL-gestütztes Fixed-Window-Limit je Endpunkt und IP-HMAC.
- Honeypot-Feld in öffentlichen Formularen.
- Client-IP: mit `TRUST_PROXY=true` aus `X-Real-IP` bzw. dem vom Proxy rechts angehängten
  `X-Forwarded-For`-Eintrag. Ohne Proxy setzt Next.js `X-Forwarded-For` aus der Socket-Adresse;
  ein vom Client gefälschter Header verschiebt nur dessen eigenen Bucket (kein Aussperren
  Dritter). Login ist zusätzlich pro Konto begrenzt. Produktion: hinter Proxy betreiben.

### 2.9 Datenminimierung & Verschlüsselung
- Keine Adressfelder; Ortsangaben auf Ortsebene; DB-Constraint `precision_m >= 100`.
- Öffentliche Koordinaten werden serverseitig auf ein Raster gerundet (0,01° ≈ 1,1 km;
  Minderjährige 0,02°).
- Adressmuster (Straße + Hausnummer) werden in öffentlichen Vermisstenmeldungen abgelehnt.
- Kontaktdaten von Hinweisgebern/Meldenden: **AES-256-GCM** (`DATA_ENCRYPTION_KEY`),
  Entschlüsselung nur in der Moderationsansicht (Zugriff wird im Audit-Log protokolliert).
- IP-Adressen werden **nie im Klartext** gespeichert, nur als HMAC-SHA-256 (`IP_HASH_SECRET`)
  zur Missbrauchserkennung; Löschung durch Retention-Skript.
- Bilder: EXIF-Entfernung (s. o.).
- Gefundene Personen: Bilder/Beschreibung/Orte werden automatisch nicht mehr öffentlich
  ausgeliefert.

### 2.10 Audit-Log
- Jede administrative Änderung (Fall, Person, Status, Veröffentlichung, Quelle, Ort, Timeline,
  Medien, Hinweis-/Meldungsentscheidung, Benutzer/Rolle, Entschlüsselung von Kontaktdaten,
  Löschung) wird mit Benutzer, Aktion, Objekt, Alt-/Neuwerten und Zeitpunkt protokolliert.
- Append-only per DB-Trigger. Kontaktdaten werden **nicht** ins Audit-Log kopiert.

### 2.11 HTTP-Sicherheitsheader
`Content-Security-Policy`, `Strict-Transport-Security` (Produktion), `X-Content-Type-Options:
nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
`Permissions-Policy: camera=(), microphone=(), geolocation=(self)`,
`Cross-Origin-Opener-Policy: same-origin`. `X-Powered-By` deaktiviert.

### 2.12 Fehlerbehandlung
- Einheitliche Fehlerobjekte; bei `500` keine Stacktraces/Interna an den Client.
- Validierungsfehler nennen Felder, aber keine internen Werte.

## 3. Automatisierte Sicherheitstests

| Thema | Test |
|---|---|
| Rollenmatrix | `tests/unit/permissions.test.ts` |
| Öffentliche DTOs enthalten keine internen Felder | `tests/unit/public-dto.test.ts` |
| IDOR / unautorisierte Admin-Aufrufe (401/403) | `tests/integration/api-authz.test.ts` |
| Nicht veröffentlichte/archivierte Fälle → 404, nicht in Suche/Karte | `tests/integration/public-leak.test.ts` |
| Zugriff auf Hinweise / interne Notizen | `tests/integration/public-leak.test.ts`, `api-authz.test.ts` |
| Upload-Manipulation (falsche Magic Bytes, Polyglot, Größe) | `tests/unit/upload.test.ts` |
| XSS-Payloads werden gespeichert, aber nie als HTML interpretiert; `javascript:`-URLs abgelehnt | `tests/unit/validation.test.ts` |
| SQL-Injection über Suchparameter | `tests/unit/search.test.ts`, `tests/integration/public-leak.test.ts` |
| Rate Limiting | `tests/integration/rate-limit.test.ts` |
| Storage: Path Traversal, Thumbnail-Schlüssel | `tests/unit/storage.test.ts` |
| Auth-Prüfung vor Body-Parsing (große Uploads) | `tests/integration/api-authz.test.ts` |
| CSRF-Origin-Prüfung | `tests/unit/csrf.test.ts` |
| Veröffentlichungsregeln (Quelle, Minderjährige, URGENT) | `tests/integration/workflow.test.ts` |

## 4. Bekannte Restrisiken / offene Punkte

- **Rechtliche Prüfung** (DSGVO-Verarbeitungsverzeichnis, DSFA, Rechtsgrundlagen,
  Bildrechte/KUG, Impressum) ist vor Produktivbetrieb zwingend – nicht Teil der Software.
- Keine 2-Faktor-Authentifizierung im MVP (Roadmap: TOTP für moderator+ verpflichtend).
- Kein Virenscanner für Video-Anhänge (Roadmap: ClamAV); Videos werden nie öffentlich
  ausgeliefert und nur mit `Content-Disposition: attachment` an Moderatoren.
- Dev-Abhängigkeit `vitest@3` meldet eine moderate Advisory (Mocker-Pfad), die nur lokale
  Testläufe betrifft; Upgrade auf `vitest@4` scheitert derzeit an einem npm-Resolver-Fehler.
- Schlüsselrotation für `DATA_ENCRYPTION_KEY` ist vorbereitet (Key-ID-Präfix), aber noch
  nicht automatisiert.

## 5. Meldung von Sicherheitslücken

Bitte vertraulich an die Betreiber melden (Kontakt im Impressum); keine öffentlichen Issues.
