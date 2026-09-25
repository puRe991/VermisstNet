# VermisstAtlas – Roadmap

## Phase 0 – Analyse ✅
Anforderungen, Risiken, Architektur, Datenmodell, Seitenstruktur, API, Rollen, Sicherheit
(`docs/`).

## MVP (dieses Repository)

| # | Schritt | Status |
|---|---|---|
| 1 | Repository-Analyse | ✅ (leeres Repository, Neuaufbau) |
| 2 | Architektur dokumentiert | ✅ |
| 3 | Datenbankmodell (Prisma + PostGIS) | ✅ |
| 4 | Migrationen (inkl. GENERATED `geom`, Suchfunktion, Audit-Trigger) | ✅ |
| 5 | Authentifizierung (Argon2id, DB-Sessions, Rollen) | ✅ |
| 6 | Backend/API (Service-Layer, Zod, DTOs) | ✅ |
| 7 | Adminbereich / Moderationsdashboard | ✅ |
| 8 | Fallverwaltung (Anlegen, Bearbeiten, Status, Veröffentlichung) | ✅ |
| 9 | Öffentliche Fallseiten | ✅ |
| 10 | Karte (Leaflet/OSM, Clustering, Filter, Generalisierung) | ✅ |
| 11 | Hinweis-System | ✅ |
| 12 | Quellenverwaltung | ✅ |
| 13 | Medienverwaltung (Upload, Re-Encoding, Freigabe) | ✅ |
| 14 | Suche & Filter (tsvector) | ✅ |
| 15 | Sicherheitsprüfungen | ✅ |
| 16 | Tests (Unit + Integration gegen PostgreSQL) | ✅ |
| 17 | Deployment-Dokumentation | ✅ |

## Nächste Ausbaustufen

### Stufe 2 – Betrieb & Vertrauen
- TOTP-2FA verpflichtend für moderator/editor/administrator
- E-Mail-Benachrichtigungen (neue Hinweise an zuständige Moderatoren, Status an Meldende)
- Rückfrage-Kanal zu Hinweisgebern über Referenzcode (ohne Klartext-Kontakt)
- S3-kompatibler Storage-Treiber, CDN für freigegebene Bilder
- Virenscan (ClamAV) für Anhänge, Video-Transcoding ohne Metadaten
- Schlüsselrotation für Kontaktdaten-Verschlüsselung
- Strukturierte Logs + Monitoring (OpenTelemetry), Alarme bei Fehlerraten

### Stufe 3 – Fachliche Erweiterungen
- Mehrsprachigkeit (DE/EN/TR/AR/UK …) für Fallseiten
- Geocoding mit eigener Nominatim-Instanz (Ortsvorschläge statt manueller Koordinaten)
- Zuweisung von Aufgaben an Moderatoren, SLA-Übersicht
- Import-Schnittstelle für behördliche Fahndungen (mit manueller Freigabe)
- Automatische Depublikation gefundener Personen nach Frist
- Druck-/Plakatansicht (PDF) für aktive Fälle
- Barrierefreiheitsaudit (WCAG 2.2 AA) und Lighthouse-Budget in CI

### Stufe 4 – Skalierung
- Serverseitiges Marker-Clustering (Supercluster/PostGIS `ST_ClusterDBSCAN`) für >50 000 Fälle
- Read-Replica für öffentliche Abfragen
- Redis für Rate Limiting/Cache
- Vektorkacheln (MapLibre) statt Rasterkacheln
