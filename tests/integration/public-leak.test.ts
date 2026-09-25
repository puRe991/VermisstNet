import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { GET as listCases } from "@/app/api/cases/route";
import { GET as getCase } from "@/app/api/cases/[id]/route";
import { GET as getTimeline } from "@/app/api/cases/[id]/timeline/route";
import { GET as getGeo } from "@/app/api/cases/[id]/geo-analysis/route";
import { GET as getMap } from "@/app/api/map/cases/route";
import { GET as getSources } from "@/app/api/sources/route";
import { GET as getFile } from "@/app/api/media/[id]/file/route";
import { storage } from "@/server/storage";
import { createCase, createUser, ctx, readJson, req, resetDb } from "../helpers/fixtures";

const SECRETS = /SECRET-|Geheimnachname|birthDate|internalNotes|internalReference|storageKey|contactEnc|ipHash/;

let published: Awaited<ReturnType<typeof createCase>>;
let draft: Awaited<ReturnType<typeof createCase>>;
let archived: Awaited<ReturnType<typeof createCase>>;
let unpublished: Awaited<ReturnType<typeof createCase>>;
let found: Awaited<ReturnType<typeof createCase>>;

beforeAll(async () => {
  await resetDb();
  published = await createCase({ firstName: "Sichtbar", city: "Hagen" });
  draft = await createCase({ published: false, firstName: "Entwurfsperson", city: "Dortmund" });
  archived = await createCase({ status: "ARCHIVED", firstName: "Archivperson", city: "Bochum" });
  unpublished = await createCase({ firstName: "Zurückgezogen", city: "Essen" });
  await prisma.case.update({ where: { id: unpublished.id }, data: { publicationStatus: "UNPUBLISHED" } });
  await prisma.$executeRaw`SELECT refresh_case_search(${unpublished.id}::uuid)`;
  found = await createCase({ status: "FOUND", firstName: "Gefundene", city: "Hagen" });
  // Hinweis mit Kontakt – darf nirgends öffentlich erscheinen
  await prisma.hint.create({
    data: {
      referenceCode: "H-TEST-0001",
      caseId: published.id,
      hintType: "PERSON_SEEN",
      description: "SECRET-HINT-TEXT",
      contactEnc: "k1:x:y:z",
      originalPayload: {},
    },
  });
});

describe("Öffentliche API gibt keine internen Daten preis", () => {
  it("Liste enthält nur veröffentlichte, nicht archivierte Fälle – ohne interne Felder", async () => {
    const { status, body, text } = await readJson(await listCases(req("/api/cases?status=ACTIVE,FOUND,CLOSED"), ctx({})));
    expect(status).toBe(200);
    const numbers = (body as { items: { publicNumber: string }[] }).items.map((i) => i.publicNumber).sort();
    expect(numbers).toEqual([published.publicNumber, found.publicNumber].sort());
    expect(text).not.toMatch(SECRETS);
    expect(text).not.toContain("SECRET-HINT-TEXT");
  });

  it("Fallseite enthält keine internen Felder, Orte oder Timeline-Einträge", async () => {
    const { status, text } = await readJson(await getCase(req(`/api/cases/${published.publicNumber}`), ctx({ id: published.publicNumber })));
    expect(status).toBe(200);
    expect(text).not.toMatch(SECRETS);
    expect(text).not.toContain("SECRET-HINT-TEXT");
    expect(text).not.toContain(published.id); // interne UUID wird nicht benötigt
  });

  it.each([
    ["Entwurf", () => draft],
    ["archiviert", () => archived],
    ["zurückgezogen", () => unpublished],
  ])("%s → 404 auf allen öffentlichen Endpunkten", async (_label, get) => {
    const c = get();
    expect((await getCase(req(`/api/cases/${c.publicNumber}`), ctx({ id: c.publicNumber }))).status).toBe(404);
    expect((await getTimeline(req(`/api/cases/${c.publicNumber}/timeline`), ctx({ id: c.publicNumber }))).status).toBe(404);
    expect((await getGeo(req(`/api/cases/${c.publicNumber}/geo-analysis`), ctx({ id: c.publicNumber }))).status).toBe(404);
    expect((await getSources(req(`/api/sources?case=${c.publicNumber}`), ctx({}))).status).toBe(404);
  });

  it("nicht veröffentlichte Fälle sind nicht über die Suche auffindbar (auch nicht per Fallnummer)", async () => {
    for (const q of ["Entwurfsperson", "Archivperson", "Zurückgezogen", draft.publicNumber, "SECRET", "Geheimnachname"]) {
      const { body } = await readJson(await listCases(req(`/api/cases?q=${encodeURIComponent(q)}&status=ACTIVE,FOUND,CLOSED`), ctx({})));
      expect((body as { total: number }).total, q).toBe(0);
    }
    const hit = await readJson(await listCases(req(`/api/cases?q=Sichtbar`), ctx({})));
    expect((hit.body as { total: number }).total).toBe(1);
  });

  it("Suchindex enthält keine internen Daten", async () => {
    const rows = await prisma.$queryRaw<{ v: string | null }[]>`SELECT search_vector::text AS v FROM cases`;
    for (const r of rows) {
      expect(r.v ?? "").not.toMatch(/secret|geheimnachname/i);
    }
  });

  it("Karte zeigt nur aktive, veröffentlichte Fälle mit generalisierten, öffentlichen Orten", async () => {
    const { status, body, text } = await readJson(await getMap(req("/api/map/cases"), ctx({})));
    expect(status).toBe(200);
    const items = (body as { items: { publicNumber: string; lat: number; lng: number }[] }).items;
    expect(items.map((i) => i.publicNumber)).toEqual([published.publicNumber]);
    // exakte Koordinate 51.35947/7.47318 darf nicht erscheinen, interner Ort (51.4/7.5) auch nicht
    expect(text).not.toContain("51.35947");
    expect(text).not.toContain("SECRET-LOCATION");
    expect(items[0]!.lat).toBe(51.36);
  });

  it("gefundene Fälle: reduzierte Darstellung", async () => {
    const { body } = await readJson(await getCase(req(`/api/cases/${found.publicNumber}`), ctx({ id: found.publicNumber })));
    const b = body as { reduced: boolean; images: unknown[]; locations: unknown[]; person: unknown };
    expect(b.reduced).toBe(true);
    expect(b.images).toEqual([]);
    expect(b.locations).toEqual([]);
    expect(b.person).toBeNull();
  });

  it("Geo-Analyse ist als automatisch berechnet gekennzeichnet", async () => {
    const { body } = await readJson(await getGeo(req(`/api/cases/${published.publicNumber}/geo-analysis`), ctx({ id: published.publicNumber })));
    expect(body).toMatchObject({ computed: true, label: "Automatisch berechnet / nicht bestätigt" });
  });

  it("SQL-Injection über Suchparameter bleibt wirkungslos", async () => {
    const payloads = ["' OR 1=1 --", "x'); DROP TABLE cases; --", "%' OR '1'='1", "\\"];
    for (const q of payloads) {
      const res = await listCases(req(`/api/cases?q=${encodeURIComponent(q)}&city=${encodeURIComponent(q)}`), ctx({}));
      expect(res.status).toBe(200);
      expect(((await res.json()) as { total: number }).total).toBe(0);
    }
    expect(await prisma.case.count()).toBeGreaterThan(0);
  });
});

describe("Dateizugriff", () => {
  it("interne Medien (z. B. Hinweis-Anhänge) sind für Besucher nicht abrufbar, für Moderatoren schon", async () => {
    await storage().put("hints/test/secret.webp", Buffer.from("RIFF0000WEBPtest"));
    const hint = await prisma.hint.findFirstOrThrow();
    const m = await prisma.media.create({
      data: { hintId: hint.id, storageKey: "hints/test/secret.webp", mimeType: "image/webp", sizeBytes: 16, sha256: "x", mediaType: "PHOTO" },
    });
    expect((await getFile(req(`/api/media/${m.id}/file`), ctx({ id: m.id }))).status).toBe(404);
    const reporter = await createUser("REPORTER");
    expect((await getFile(req(`/api/media/${m.id}/file`, { cookie: reporter.cookie }), ctx({ id: m.id }))).status).toBe(404);
    const mod = await createUser("MODERATOR");
    const res = await getFile(req(`/api/media/${m.id}/file`, { cookie: mod.cookie }), ctx({ id: m.id }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("freigegebenes Bild eines veröffentlichten Falls ist öffentlich; ungeklärtes Urheberrecht nicht", async () => {
    await storage().put("cases/test/pub.webp", Buffer.from("RIFF0000WEBPtest"));
    const ok = await prisma.media.create({
      data: { caseId: published.id, storageKey: "cases/test/pub.webp", mimeType: "image/webp", sizeBytes: 16, sha256: "x", visibility: "PUBLIC", reviewStatus: "APPROVED", copyrightStatus: "OFFICIAL_RELEASE" },
    });
    expect((await getFile(req(`/api/media/${ok.id}/file`), ctx({ id: ok.id }))).status).toBe(200);
    await prisma.media.update({ where: { id: ok.id }, data: { copyrightStatus: "UNKNOWN" } });
    expect((await getFile(req(`/api/media/${ok.id}/file`), ctx({ id: ok.id }))).status).toBe(404);
    expect((await getFile(req(`/api/media/not-a-uuid/file`), ctx({ id: "not-a-uuid" }))).status).toBe(404);
  });
});
