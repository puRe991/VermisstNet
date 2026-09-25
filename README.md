# VermisstAtlas

Plattform zur strukturierten Verwaltung, Moderation und Darstellung **verifizierter**
Vermisstenfälle – mit echtem Backend (Next.js + PostgreSQL/PostGIS), rollenbasierter
Authentifizierung, Moderations- und Freigabeprozess, Karte, Volltextsuche und Audit-Log.

> Alle mitgelieferten Beispieldaten sind **DEMO DATA** mit ausschließlich fiktiven Personen.

## Schnellstart

```bash
cp .env.example .env          # Schlüssel eintragen (siehe docs/DEPLOYMENT.md)
docker compose up -d db       # PostgreSQL 16 + PostGIS
npm ci
npm run db:migrate
npm run db:seed               # fiktive Demo-Fälle + Demo-Konten
npm run dev
```

## Funktionen (MVP)

- Öffentlich: Startseite mit Suche, Fallliste mit Filtern, Fallseite (Suchbild, Beschreibung,
  Chronologie, Karte mit generalisierten Bereichen, gekennzeichnete Geo-Analyse, Quellen),
  interaktive Karte mit Clustering, Hinweis melden, Vermisstenfall melden, Inhalt melden
- Konten: Registrierung (Rolle *reporter*), Login, eigene Meldungen/Hinweise mit Status
- Moderation: Dashboard, Hinweise, Fallmeldungen (Workflow bis Fallentwurf), Quellenprüfung,
  gemeldete Inhalte, Fallverwaltung (Person, Status, URGENT, Veröffentlichung, Orte, Quellen,
  Medien, Chronologie), Benutzer & Rollen, Audit-Log, Löschung personenbezogener Daten

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Anforderungen, Risiken, Architektur, Seiten, Rollen, Workflows |
| [docs/DATABASE.md](docs/DATABASE.md) | Datenmodell, PostGIS, Suche, Integritätsregeln |
| [docs/API.md](docs/API.md) | alle Endpunkte |
| [docs/SECURITY.md](docs/SECURITY.md) | Sicherheits- & Datenschutzkonzept, Tests |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Betrieb, Konfiguration, Go-Live-Checkliste |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Stand und Ausbaustufen |

## Qualität

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
