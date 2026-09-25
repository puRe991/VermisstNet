/**
 * DEMO DATA – ausschließlich FIKTIVE Personen.
 * Keine realen vermissten Personen, keine realen Aktenzeichen, keine echten Fotos.
 * Suchbilder sind generierte neutrale Silhouetten mit der Aufschrift "DEMO".
 *
 * Aufruf: npm run db:seed   (in Produktion nur mit ALLOW_DEMO_SEED=true)
 */
import { PrismaClient, type Gender, type PrivacyLevel, type SourceType, type TimelineEventType } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import sharp from "sharp";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-Passwort-2026!";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Demo-Seed in Produktion ist deaktiviert (ALLOW_DEMO_SEED=true setzen, falls gewollt).");
  process.exit(1);
}

function encrypt(plain: string): string {
  const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY fehlt/ungültig");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["k1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

function daysAgo(days: number, hour = 12): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

const COLORS = ["#5b6b7a", "#6b5b7a", "#5b7a6b", "#7a6b5b", "#4f6475", "#70657f"];

/** Neutrale Silhouette als Platzhalter-Suchbild (kein echtes Foto). */
async function silhouette(seed: number): Promise<{ full: Buffer; thumb: Buffer; width: number; height: number }> {
  const bg = COLORS[seed % COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">
    <rect width="600" height="750" fill="${bg}"/>
    <circle cx="300" cy="290" r="120" fill="#e8ecef" opacity="0.85"/>
    <path d="M110 750 C110 560 200 470 300 470 C400 470 490 560 490 750 Z" fill="#e8ecef" opacity="0.85"/>
    <rect x="0" y="36" width="600" height="70" fill="#1f2933" opacity="0.75"/>
    <text x="300" y="84" font-family="sans-serif" font-size="40" font-weight="700" fill="#ffffff" text-anchor="middle">DEMO DATA</text>
    <text x="300" y="712" font-family="sans-serif" font-size="26" fill="#1f2933" text-anchor="middle">Fiktive Person – kein echtes Foto</text>
  </svg>`;
  const full = await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
  const thumb = await sharp(full).resize({ width: 480 }).webp({ quality: 75 }).toBuffer();
  return { full, thumb, width: 600, height: 750 };
}

async function storeFile(key: string, data: Buffer) {
  const root = path.resolve(process.cwd(), process.env.STORAGE_DIR ?? "./storage");
  const full = path.join(root, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

type DemoCase = {
  firstName: string;
  lastName: string;
  age: number;
  gender: Gender;
  privacy: PrivacyLevel;
  height?: number;
  build?: string;
  hair?: string;
  eyes?: string;
  features?: string;
  clothing?: string;
  daysMissing: number;
  place: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  lastKnown?: { label: string; lat: number; lng: number; hoursAfter: number };
  circumstances: string;
  authority: string;
  sourceType: SourceType;
  status?: "ACTIVE" | "FOUND" | "CLOSED";
  urgent?: boolean;
  published?: boolean;
};

const CASES: DemoCase[] = [
  {
    firstName: "Mira", lastName: "Demonstra", age: 17, gender: "FEMALE", privacy: "FIRST_NAME_INITIAL",
    height: 165, build: "schlank", hair: "dunkel, lang", eyes: "braun", clothing: "schwarzes Kopftuch, graue Jacke, weiße Turnschuhe",
    daysMissing: 19, place: "Hagen, Innenstadt", city: "Hagen", state: "DE-NW", lat: 51.3594, lng: 7.4731,
    lastKnown: { label: "Hagen Hauptbahnhof (Umgebung)", lat: 51.3627, lng: 7.4606, hoursAfter: 3 },
    circumstances: "DEMO DATA – fiktiver Fall. Die Jugendliche wurde zuletzt am Nachmittag in der Innenstadt gesehen.",
    authority: "Polizeipräsidium Musterstadt (DEMO)", sourceType: "POLICE", urgent: true,
  },
  {
    firstName: "Jonas", lastName: "Probemann", age: 34, gender: "MALE", privacy: "FULL_NAME",
    height: 182, build: "kräftig", hair: "blond, kurz", eyes: "blau", features: "Tätowierung am rechten Unterarm (Anker)",
    clothing: "dunkelblaue Regenjacke, Jeans", daysMissing: 42, place: "Hamburg-Altona", city: "Hamburg", state: "DE-HH",
    lat: 53.5503, lng: 9.9356, circumstances: "DEMO DATA – fiktiver Fall. Verließ die Wohnung am Morgen und kehrte nicht zurück.",
    authority: "Polizei Beispielstadt (DEMO)", sourceType: "POLICE",
  },
  {
    firstName: "Helga", lastName: "Testgard", age: 79, gender: "FEMALE", privacy: "FULL_NAME",
    height: 158, build: "zierlich", hair: "grau, kurz", eyes: "grün", features: "Gehstock, orientierungslos",
    clothing: "beiger Mantel, rote Mütze", daysMissing: 3, place: "München, Schwabing", city: "München", state: "DE-BY",
    lat: 48.1642, lng: 11.5856, circumstances: "DEMO DATA – fiktiver Fall. Die Seniorin verließ ihre Einrichtung am Abend.",
    authority: "Polizeipräsidium Musterland (DEMO)", sourceType: "POLICE", urgent: true,
  },
  {
    firstName: "Luca", lastName: "Fiktivo", age: 15, gender: "MALE", privacy: "FIRST_NAME_INITIAL",
    height: 170, build: "schlank", hair: "braun, lockig", eyes: "braun", clothing: "grüner Hoodie, schwarzer Rucksack",
    daysMissing: 8, place: "Leipzig, Connewitz", city: "Leipzig", state: "DE-SN", lat: 51.3131, lng: 12.3869,
    lastKnown: { label: "Leipzig Hauptbahnhof (Umgebung)", lat: 51.3455, lng: 12.3810, hoursAfter: 5 },
    circumstances: "DEMO DATA – fiktiver Fall. Kam nach der Schule nicht nach Hause.",
    authority: "Polizeidirektion Demostadt (DEMO)", sourceType: "POLICE",
  },
  {
    firstName: "Sara", lastName: "Mustermann", age: 26, gender: "FEMALE", privacy: "FULL_NAME",
    height: 172, build: "sportlich", hair: "rot, schulterlang", eyes: "blau", clothing: "Laufkleidung, gelbe Jacke",
    daysMissing: 120, place: "Köln, Deutz", city: "Köln", state: "DE-NW", lat: 50.9364, lng: 6.9747,
    circumstances: "DEMO DATA – fiktiver Fall. Brach zu einer Joggingrunde entlang des Rheins auf.",
    authority: "Polizei Beispielstadt (DEMO)", sourceType: "OFFICIAL_AUTHORITY",
  },
  {
    firstName: "Emil", lastName: "Platzhalter", age: 52, gender: "MALE", privacy: "FIRST_NAME_INITIAL",
    height: 176, build: "normal", hair: "dunkelgrau", eyes: "braun", clothing: "Arbeitskleidung, orange Weste",
    daysMissing: 15, place: "Berlin-Neukölln", city: "Berlin", state: "DE-BE", lat: 52.4811, lng: 13.4354,
    circumstances: "DEMO DATA – fiktiver Fall. Nach Schichtende nicht mehr erreichbar.",
    authority: "Polizei Demostadt (DEMO)", sourceType: "POLICE",
  },
  {
    firstName: "Noah", lastName: "Exempel", age: 11, gender: "MALE", privacy: "FIRST_NAME_INITIAL",
    height: 145, build: "schlank", hair: "hellbraun", eyes: "blau", clothing: "rote Jacke, blaue Mütze",
    daysMissing: 1, place: "Hannover, List", city: "Hannover", state: "DE-NI", lat: 52.3920, lng: 9.7470,
    circumstances: "DEMO DATA – fiktiver Fall. Vom Spielplatz nicht zurückgekehrt.",
    authority: "Polizeidirektion Musterland (DEMO)", sourceType: "POLICE", urgent: true,
  },
  {
    firstName: "Alex", lastName: "Beispiel", age: 29, gender: "DIVERSE", privacy: "ANONYMIZED",
    height: 168, build: "schlank", hair: "schwarz, kurz", eyes: "grau", clothing: "Parka in Olivgrün",
    daysMissing: 60, place: "Frankfurt am Main, Bornheim", city: "Frankfurt am Main", state: "DE-HE", lat: 50.1296, lng: 8.7106,
    circumstances: "DEMO DATA – fiktiver Fall. Letzter Kontakt per Telefon am Abend.",
    authority: "Polizeipräsidium Musterstadt (DEMO)", sourceType: "POLICE",
  },
  {
    firstName: "Ida", lastName: "Musterfrau", age: 44, gender: "FEMALE", privacy: "FULL_NAME",
    height: 169, build: "normal", hair: "braun", eyes: "grün", clothing: "schwarzer Mantel",
    daysMissing: 200, place: "Dresden, Neustadt", city: "Dresden", state: "DE-SN", lat: 51.0660, lng: 13.7530,
    circumstances: "DEMO DATA – fiktiver Fall.", authority: "Polizeidirektion Demostadt (DEMO)", sourceType: "POLICE",
    status: "FOUND",
  },
  {
    firstName: "Paul", lastName: "Vorlage", age: 67, gender: "MALE", privacy: "FIRST_NAME_INITIAL",
    height: 180, build: "schlank", hair: "weiß", eyes: "blau", clothing: "Wanderjacke, Wanderstöcke",
    daysMissing: 25, place: "Freiburg im Breisgau, Umgebung", city: "Freiburg im Breisgau", state: "DE-BW", lat: 47.9990, lng: 7.8421,
    lastKnown: { label: "Schauinsland (Wanderparkplatz, Umgebung)", lat: 47.9110, lng: 7.8980, hoursAfter: 6 },
    circumstances: "DEMO DATA – fiktiver Fall. Zu einer Tageswanderung aufgebrochen.",
    authority: "Polizeipräsidium Musterland (DEMO)", sourceType: "POLICE",
  },
  {
    firstName: "Lea", lastName: "Entwurf", age: 16, gender: "FEMALE", privacy: "FIRST_NAME_INITIAL",
    daysMissing: 2, place: "Essen, Rüttenscheid", city: "Essen", state: "DE-NW", lat: 51.4330, lng: 7.0070,
    circumstances: "DEMO DATA – fiktiver Fall im Entwurf (nicht öffentlich).",
    authority: "Polizei Beispielstadt (DEMO)", sourceType: "FAMILY", published: false,
  },
];

async function main() {
  console.log("→ Lösche vorhandene Demo-Daten …");
  const demoCases = await prisma.case.findMany({ where: { isDemo: true }, select: { id: true, personId: true } });
  await prisma.case.deleteMany({ where: { id: { in: demoCases.map((c) => c.id) } } });
  await prisma.person.deleteMany({ where: { id: { in: demoCases.map((c) => c.personId) } } });
  await prisma.caseSubmission.deleteMany({ where: { personName: { contains: "(DEMO)" } } });

  console.log("→ Demo-Benutzer …");
  const passwordHash = await hash(DEMO_PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 });
  const users = {
    admin: { email: "admin@demo.vermisstatlas.invalid", displayName: "Ada Admin (DEMO)", role: "ADMINISTRATOR" as const },
    editor: { email: "redaktion@demo.vermisstatlas.invalid", displayName: "Erik Redaktion (DEMO)", role: "EDITOR" as const },
    moderator: { email: "moderation@demo.vermisstatlas.invalid", displayName: "Florian Moderation (DEMO)", role: "MODERATOR" as const },
    reporter: { email: "melder@demo.vermisstatlas.invalid", displayName: "Rita Melderin (DEMO)", role: "REPORTER" as const },
  };
  const created: Record<keyof typeof users, string> = { admin: "", editor: "", moderator: "", reporter: "" };
  for (const [k, u] of Object.entries(users) as [keyof typeof users, (typeof users)[keyof typeof users]][]) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, displayName: u.displayName, isActive: true },
      create: { ...u, passwordHash },
    });
    created[k] = row.id;
  }

  console.log("→ Demo-Fälle …");
  const year = new Date().getUTCFullYear();
  let i = 0;
  for (const d of CASES) {
    i++;
    const missingSince = daysAgo(d.daysMissing, 15);
    const counter = await prisma.$queryRaw<{ value: number }[]>`
      INSERT INTO "counters" ("name", "value") VALUES (${`case_number_${year}`}, 1)
      ON CONFLICT ("name") DO UPDATE SET "value" = "counters"."value" + 1 RETURNING "value"`;
    const publicNumber = `VA-${year}-${String(counter[0]!.value).padStart(6, "0")}`;
    const status = d.status ?? "ACTIVE";
    const published = d.published !== false;

    const c = await prisma.case.create({
      data: {
        publicNumber,
        isDemo: true,
        status,
        isUrgent: !!d.urgent && status === "ACTIVE",
        publicationStatus: published ? "PUBLISHED" : "DRAFT",
        publishedAt: published ? daysAgo(Math.max(0, d.daysMissing - 1)) : null,
        closedAt: status === "ACTIVE" ? null : daysAgo(5),
        missingSince,
        missingPlace: d.place,
        lastKnownPlace: d.lastKnown?.label ?? null,
        city: d.city,
        federalState: d.state,
        circumstances: d.circumstances,
        clothing: d.clothing ?? null,
        responsibleAuthority: d.authority,
        authorityContact: "110 oder jede Polizeidienststelle (DEMO)",
        internalReference: `DEMO-AZ-${1000 + i}`,
        internalNotes: `INTERNAL-DEMO-NOTE-${i}: Diese Notiz darf niemals öffentlich erscheinen.`,
        createdBy: { connect: { id: created.editor } },
        person: {
          create: {
            firstName: d.firstName,
            lastName: d.lastName,
            ageAtMissing: d.age,
            gender: d.gender,
            heightCm: d.height ?? null,
            build: d.build ?? null,
            hairColor: d.hair ?? null,
            eyeColor: d.eyes ?? null,
            distinguishingFeatures: d.features ?? null,
            description: "DEMO DATA – fiktive Person.",
            privacyLevel: d.privacy,
          },
        },
      },
    });

    const source = await prisma.source.create({
      data: {
        caseId: c.id,
        sourceType: d.sourceType,
        organization: d.authority,
        title: `Vermisstenmeldung ${d.city} (DEMO DATA)`,
        url: "https://example.org/demo-vermisstenmeldung",
        publicationDate: daysAgo(Math.max(0, d.daysMissing - 1)),
        verifiedAt: published ? daysAgo(Math.max(0, d.daysMissing - 1)) : null,
        verifiedById: published ? created.moderator : null,
        notes: `INTERNAL-SOURCE-NOTE-${i}`,
        createdById: created.moderator,
      },
    });

    const missingLoc = await prisma.location.create({
      data: {
        caseId: c.id, type: "MISSING_LOCATION", label: d.place, city: d.city, federalState: d.state,
        latitude: d.lat, longitude: d.lng, precisionM: 1000, observedAt: missingSince,
        visibility: "PUBLIC", isConfirmed: true, sourceId: source.id,
      },
    });
    if (d.lastKnown) {
      await prisma.location.create({
        data: {
          caseId: c.id, type: "LAST_KNOWN_LOCATION", label: d.lastKnown.label, city: d.city, federalState: d.state,
          latitude: d.lastKnown.lat, longitude: d.lastKnown.lng, precisionM: 500,
          observedAt: new Date(missingSince.getTime() + d.lastKnown.hoursAfter * 3600_000),
          visibility: "PUBLIC", isConfirmed: true, sourceId: source.id,
        },
      });
    }
    // Interne, genauere Ortsangabe – darf öffentlich nie erscheinen
    await prisma.location.create({
      data: {
        caseId: c.id, type: "POSSIBLE_LOCATION", label: `INTERNAL-LOCATION-${i}`, city: d.city,
        latitude: d.lat + 0.004, longitude: d.lng - 0.003, precisionM: 100, visibility: "INTERNAL",
      },
    });

    const events: { type: TimelineEventType; at: Date; text: string; visibility: "PUBLIC" | "INTERNAL" }[] = [
      { type: "MISSING", at: missingSince, text: `Letzter bestätigter Aufenthalt: ${d.place}.`, visibility: "PUBLIC" },
      { type: "POLICE_REPORT", at: new Date(missingSince.getTime() + 20 * 3600_000), text: "Vermisstenanzeige wurde aufgenommen.", visibility: "PUBLIC" },
      { type: "PUBLIC_SEARCH", at: new Date(missingSince.getTime() + 30 * 3600_000), text: "Offizielle Fahndungsinformation veröffentlicht.", visibility: "PUBLIC" },
      { type: "NEW_INFORMATION", at: new Date(missingSince.getTime() + 40 * 3600_000), text: `INTERNAL-TIMELINE-${i}: interne Ermittlungsnotiz.`, visibility: "INTERNAL" },
    ];
    if (status === "FOUND") {
      events.push({ type: "FOUND", at: daysAgo(5), text: "Die Person wurde gefunden. Die öffentliche Suche ist beendet.", visibility: "PUBLIC" });
    }
    for (const e of events) {
      await prisma.timelineEvent.create({
        data: {
          caseId: c.id, type: e.type, occurredAt: e.at, description: e.text, visibility: e.visibility,
          sourceId: e.type === "PUBLIC_SEARCH" ? source.id : null,
          locationId: e.type === "MISSING" ? missingLoc.id : null,
          createdById: created.editor,
        },
      });
    }

    const img = await silhouette(i);
    const key = `cases/demo/demo-${publicNumber.toLowerCase()}.webp`;
    await storeFile(key, img.full);
    await storeFile(key.replace(/\.webp$/, ".thumb.webp"), img.thumb);
    await prisma.media.create({
      data: {
        caseId: c.id, storageKey: key, mimeType: "image/webp", sizeBytes: img.full.length,
        width: img.width, height: img.height, sha256: createHash("sha256").update(img.full).digest("hex"),
        hasThumbnail: true, mediaType: "SEARCH_IMAGE", title: "Platzhalter-Suchbild (DEMO DATA)",
        sourceText: "Generierte Silhouette, kein echtes Foto", sourceId: source.id,
        copyrightStatus: "LICENSED", visibility: "PUBLIC", reviewStatus: published ? "APPROVED" : "PENDING",
        isPrimary: true, uploadedById: created.editor,
      },
    });

    await prisma.$executeRaw`SELECT refresh_case_search(${c.id}::uuid)`;

    if (i <= 3 && status === "ACTIVE" && published) {
      await prisma.hint.create({
        data: {
          referenceCode: `H-DEMO-${String(i).padStart(4, "0")}`,
          caseId: c.id,
          hintType: i === 1 ? "PERSON_SEEN" : i === 2 ? "VEHICLE" : "POSSIBLE_LOCATION",
          observedDate: daysAgo(Math.max(0, d.daysMissing - 2)),
          observedTime: "17:30",
          locationText: `${d.city}, Nähe Bushaltestelle (DEMO)`,
          description: "DEMO DATA – fiktiver Hinweis. Person ähnlich der Beschreibung gesehen.",
          isAnonymous: i !== 1,
          contactEnc: i === 1 ? encrypt("demo-hinweisgeber@example.org") : null,
          reporterId: i === 1 ? created.reporter : null,
          originalPayload: { demo: true, description: "DEMO DATA – fiktiver Hinweis." },
        },
      });
    }
  }

  await prisma.caseSubmission.create({
    data: {
      referenceCode: "M-DEMO-0001",
      status: "SUBMITTED",
      originalPayload: { demo: true },
      personName: "Tim Demofall (DEMO)",
      age: 19,
      gender: "MALE",
      missingSince: daysAgo(4),
      missingPlace: "Bremen, Viertel",
      description: "DEMO DATA – fiktive Meldung.",
      circumstances: "Nach einem Konzert nicht nach Hause gekommen (fiktiv).",
      sourceText: "Aufruf der Familie in sozialen Medien (DEMO)",
      sourceUrl: "https://example.org/demo-aufruf",
      contactEnc: encrypt("demo-meldende@example.org"),
      reporterId: created.reporter,
    },
  });

  const firstCase = await prisma.case.findFirst({ where: { isDemo: true, publicationStatus: "PUBLISHED" }, orderBy: { createdAt: "asc" } });
  if (firstCase) {
    await prisma.contentReport.create({
      data: { caseId: firstCase.id, reason: "INCORRECT_INFORMATION", message: "DEMO DATA – Die Körpergröße scheint falsch zu sein." },
    });
  }

  console.log("\n✔ DEMO DATA angelegt (nur fiktive Personen).");
  console.log(`  Demo-Konten (Passwort: ${DEMO_PASSWORD}):`);
  for (const u of Object.values(users)) console.log(`   - ${u.role.padEnd(13)} ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
