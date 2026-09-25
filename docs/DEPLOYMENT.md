# VermisstAtlas – Betrieb & Deployment

## 1. Voraussetzungen

| Komponente | Version |
|---|---|
| Node.js | ≥ 20.18 (empfohlen 22 LTS) |
| PostgreSQL | ≥ 15 mit **PostGIS ≥ 3** |
| Persistenter Speicher | für `STORAGE_DIR` (Uploads), bis zur Umstellung auf S3-Treiber |
| Reverse Proxy | TLS-Terminierung (Caddy, nginx, Traefik, Plattform-Proxy) |

## 2. Lokale Entwicklung

```bash
cp .env.example .env
# Schlüssel erzeugen:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # DATA_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # IP_HASH_SECRET

docker compose up -d db          # PostGIS lokal (oder eigene Installation)
npm ci
npm run db:migrate               # prisma migrate deploy
npm run db:seed                  # DEMO DATA (fiktive Personen + Demo-Konten)
npm run dev                      # http://localhost:3000
```

Demo-Konten (Passwort `Demo-Passwort-2026!`, nur Seed):
`admin@`, `redaktion@`, `moderation@`, `melder@demo.vermisstatlas.invalid`.

## 3. Qualitätssicherung

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint (inkl. Verbot von dangerouslySetInnerHTML / $queryRawUnsafe)
npm test             # Vitest: Unit + Integration gegen PostgreSQL (TEST_DATABASE_URL, Name muss "test" enthalten)
npm run build        # Produktions-Build
```

Die Integrationstests wenden Migrationen per `migrate deploy` auf die Test-DB an und leeren
die Tabellen zwischen den Testdateien. **Niemals** eine Produktionsdatenbank als
`TEST_DATABASE_URL` verwenden (der Test-Setup verweigert Datenbanken ohne „test“ im Namen).

CI: `.github/workflows/ci.yml` (PostGIS-Service, Typecheck, Lint, Tests, Build).

## 4. Produktion

### 4.1 Container

```bash
docker build -t vermisstatlas .
docker run -d --env-file .env.production -p 3000:3000 -v vermisst-uploads:/data/storage vermisstatlas
```

Das Image führt beim Start `prisma migrate deploy` (nicht destruktiv) aus und startet den
Next.js-Standalone-Server als unprivilegierter Benutzer.

### 4.2 Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `DATABASE_URL` | ✔ | PostgreSQL mit PostGIS, TLS empfohlen (`sslmode=require`) |
| `APP_URL` | ✔ | öffentliche Origin (`https://vermisstatlas.example`), für CSRF-Prüfung |
| `DATA_ENCRYPTION_KEY` | ✔ | 32 Byte base64, **sicher verwahren** (Verlust = Kontaktdaten unlesbar) |
| `IP_HASH_SECRET` | ✔ | zufälliges Geheimnis für IP-HMAC |
| `STORAGE_DIR` | ✔ | persistentes Upload-Verzeichnis (außerhalb des Web-Roots) |
| `TRUST_PROXY` | empfohlen | `true` hinter einem Proxy, der `X-Real-IP`/`X-Forwarded-For` **setzt/überschreibt** |
| `SESSION_TTL_HOURS` | – | Default 12 |
| `RETENTION_DAYS` | – | Default 180 |
| `NEXT_PUBLIC_TILE_URL` / `NEXT_PUBLIC_TILE_ATTRIBUTION` | – | Kachelserver (Build-Zeit-Variable!) |

### 4.3 Erster Administrator

```bash
npm run user:create -- --email admin@example.org --name "Ada Admin" --role ADMINISTRATOR
# Passwort wird interaktiv abgefragt
```

Den Demo-Seed in Produktion **nicht** ausführen (er verweigert sich ohne `ALLOW_DEMO_SEED=true`).

### 4.4 Regelmäßige Aufgaben

| Aufgabe | Befehl | Intervall |
|---|---|---|
| Datenschutz-Aufbewahrung | `npm run retention` | täglich |
| Datenbank-Backup | `pg_dump` (verschlüsselt ablegen) | täglich |
| Upload-Backup | `STORAGE_DIR` sichern | täglich |
| Abhängigkeiten prüfen | `npm audit`, Updates | wöchentlich |

### 4.5 Kartenkacheln

`tile.openstreetmap.org` ist nur für geringe Last gedacht (OSM Tile Usage Policy). Für
Produktion einen eigenen Tile-Server oder einen kommerziellen Anbieter konfigurieren
(`NEXT_PUBLIC_TILE_URL`) – die CSP übernimmt den Host automatisch.

### 4.6 Skalierung

- Mehrere App-Instanzen sind möglich: Sessions und Rate Limits liegen in PostgreSQL.
- Uploads liegen lokal → bei mehreren Instanzen gemeinsames Volume oder S3-Treiber
  (`src/server/storage`, Interface `StorageDriver`) implementieren.
- Öffentliche Lese-Endpunkte senden `s-maxage=60` → CDN-Caching möglich. Achtung: nach
  Statuswechsel (z. B. „gefunden“) können gecachte Antworten bis zu 5 Minuten sichtbar bleiben.

### 4.7 Checkliste vor Go-Live

- [ ] HTTPS erzwungen, HSTS aktiv (automatisch in `NODE_ENV=production`)
- [ ] `TRUST_PROXY` korrekt gesetzt, Proxy überschreibt `X-Forwarded-For`
- [ ] Geheimnisse in Secret-Store, nicht im Repository
- [ ] Datenschutzerklärung, Impressum, Verarbeitungsverzeichnis, DSFA juristisch geprüft
- [ ] Backups + Wiederherstellung getestet
- [ ] Retention-Job eingerichtet
- [ ] Eigener Kachelserver
- [ ] Demo-Daten nicht vorhanden (`SELECT count(*) FROM cases WHERE is_demo`)
