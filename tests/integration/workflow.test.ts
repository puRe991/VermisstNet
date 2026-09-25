import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createCase as createCaseSvc, publishCase, updateCase } from "@/server/services/admin-cases";
import { createSource, verifySource } from "@/server/services/admin-sources";
import { decideHint, decideSubmission, getHint } from "@/server/services/moderation";
import { submitCaseSubmission, submitHint } from "@/server/services/intake";
import { searchPublicCases } from "@/server/services/public-cases";
import { anonymousActor, createCase, createUser, resetDb } from "../helpers/fixtures";

beforeEach(async () => {
  await resetDb();
});

const newCaseInput = (age: number | null) => ({
  person: { firstName: "Erika", lastName: "Test", gender: "FEMALE" as const, privacyLevel: "FIRST_NAME_INITIAL" as const, ageAtMissing: age },
  missingSince: new Date("2026-09-06"),
  missingPlace: "Hagen, Innenstadt",
  isDemo: false,
});

describe("Veröffentlichungsregeln", () => {
  it("ohne verifizierte Quelle keine Veröffentlichung", async () => {
    const editor = await createUser("EDITOR");
    const { id } = await createCaseSvc(editor.actor, newCaseInput(30));
    await expect(publishCase(editor.actor, id)).rejects.toMatchObject({ code: "CONFLICT" });
    const s = await createSource(editor.actor, id, { sourceType: "FAMILY", title: "Aufruf der Familie" });
    await expect(publishCase(editor.actor, id)).rejects.toMatchObject({ code: "CONFLICT" });
    await verifySource(editor.actor, s.id, { verified: true });
    await expect(publishCase(editor.actor, id)).resolves.toMatchObject({ publicationStatus: "PUBLISHED" });
  });

  it("Minderjährige nur mit verifizierter Polizei-/Behördenquelle", async () => {
    const editor = await createUser("EDITOR");
    const { id } = await createCaseSvc(editor.actor, newCaseInput(15));
    const fam = await createSource(editor.actor, id, { sourceType: "FAMILY", title: "Aufruf der Familie" });
    await verifySource(editor.actor, fam.id, { verified: true });
    await expect(publishCase(editor.actor, id)).rejects.toMatchObject({ code: "CONFLICT" });
    const pol = await createSource(editor.actor, id, { sourceType: "POLICE", title: "Pressemitteilung" });
    await verifySource(editor.actor, pol.id, { verified: true });
    await expect(publishCase(editor.actor, id)).resolves.toBeTruthy();
  });

  it("unbekanntes Alter wird wie minderjährig behandelt", async () => {
    const editor = await createUser("EDITOR");
    const { id } = await createCaseSvc(editor.actor, newCaseInput(null));
    const fam = await createSource(editor.actor, id, { sourceType: "MEDIA", title: "Zeitungsartikel" });
    await verifySource(editor.actor, fam.id, { verified: true });
    await expect(publishCase(editor.actor, id)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("Bearbeitung einer verifizierten Quelle setzt die Verifizierung zurück", async () => {
    const mod = await createUser("MODERATOR");
    const c = await createCase();
    const { updateSource } = await import("@/server/services/admin-sources");
    const after = await updateSource(mod.actor, c.sources[0]!.id, { url: "https://example.org/geaendert" });
    expect(after.verifiedAt).toBeNull();
  });
});

describe("Status & URGENT", () => {
  it("URGENT und Statuswechsel nur durch Redaktion", async () => {
    const mod = await createUser("MODERATOR");
    const c = await createCase();
    await expect(updateCase(mod.actor, c.id, { isUrgent: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(updateCase(mod.actor, c.id, { status: "FOUND" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("Statuswechsel erzeugt Timeline-Ereignis und Audit-Eintrag im Klartextformat", async () => {
    const editor = await createUser("EDITOR", { displayName: "Florian" });
    const c = await createCase();
    await updateCase(editor.actor, c.id, { status: "FOUND" });
    const ev = await prisma.timelineEvent.findFirst({ where: { caseId: c.id, type: "FOUND" } });
    expect(ev?.visibility).toBe("PUBLIC");
    const log = await prisma.auditLog.findFirst({ where: { entityId: c.id, action: "case.status_change" } });
    expect(log?.summary).toBe("Redakteur Florian änderte Status von ACTIVE auf FOUND");
    expect(log?.oldData).toEqual({ status: "ACTIVE" });
    expect(log?.newData).toEqual({ status: "FOUND" });
  });

  it("unzulässige Statusübergänge werden abgelehnt", async () => {
    const editor = await createUser("EDITOR");
    const c = await createCase({ status: "ARCHIVED" });
    await expect(updateCase(editor.actor, c.id, { status: "ACTIVE" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("Audit-Log ist unveränderlich (DB-Trigger)", async () => {
    const editor = await createUser("EDITOR");
    const c = await createCase();
    await updateCase(editor.actor, c.id, { circumstances: "neu" });
    const log = await prisma.auditLog.findFirstOrThrow();
    await expect(prisma.auditLog.update({ where: { id: log.id }, data: { summary: "manipuliert" } })).rejects.toThrow();
    await expect(prisma.auditLog.delete({ where: { id: log.id } })).rejects.toThrow();
  });
});

describe("Fallmeldung → Fall", () => {
  it("durchläuft den Workflow und erscheint erst nach Veröffentlichung öffentlich", async () => {
    const mod = await createUser("MODERATOR");
    const editor = await createUser("EDITOR");
    const { referenceCode, status } = await submitCaseSubmission(
      anonymousActor("sub-1"),
      {
        personName: "Karla Meldungstest",
        age: 34,
        gender: "FEMALE",
        missingSince: new Date("2026-09-10"),
        missingPlace: "Bremen, Viertel",
        description: null,
        circumstances: "Nach dem Konzert nicht heimgekommen",
        sourceText: "Aufruf der Familie",
        sourceUrl: null,
        contact: "familie@example.org",
        consent: true,
        website: null,
      },
      null,
    );
    expect(status).toBe("SUBMITTED");
    const sub = await prisma.caseSubmission.findUniqueOrThrow({ where: { referenceCode } });
    expect(sub.contactEnc).not.toContain("familie@example.org"); // verschlüsselt
    expect(await prisma.case.count()).toBe(0); // kein automatischer Fall

    await decideSubmission(mod.actor, sub.id, { decision: "CONFIRM" });
    await decideSubmission(mod.actor, sub.id, { decision: "REQUEST_INFO", note: "Quelle unklar" });
    await decideSubmission(mod.actor, sub.id, { decision: "CONFIRM" });
    const approved = await decideSubmission(mod.actor, sub.id, { decision: "CONFIRM" });
    expect(approved.status).toBe("APPROVED");
    expect(approved.case).not.toBeNull();

    const draft = await prisma.case.findUniqueOrThrow({ where: { id: approved.case!.id }, include: { sources: true } });
    expect(draft.publicationStatus).toBe("DRAFT");
    expect((await searchPublicCases({ q: "Karla", page: 1, pageSize: 20 })).total).toBe(0);

    await verifySource(mod.actor, draft.sources[0]!.id, { verified: true });
    await publishCase(editor.actor, draft.id);
    expect((await prisma.caseSubmission.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe("PUBLISHED");
    expect((await searchPublicCases({ q: "Karla", page: 1, pageSize: 20 })).total).toBe(1);

    const history = await prisma.reviewEvent.findMany({ where: { entityId: sub.id } });
    expect(history.map((h) => h.decision)).toEqual(["CONFIRM", "REQUEST_INFO", "CONFIRM", "CONFIRM"]);
  });

  it("abgelehnte Meldungen können nicht weiterbearbeitet werden", async () => {
    const mod = await createUser("MODERATOR");
    const s = await prisma.caseSubmission.create({
      data: { referenceCode: "M-X", originalPayload: {}, personName: "X", missingSince: new Date(), missingPlace: "Y", sourceText: "Z" },
    });
    await decideSubmission(mod.actor, s.id, { decision: "REJECT" });
    await expect(decideSubmission(mod.actor, s.id, { decision: "CONFIRM" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("Hinweise", () => {
  it("werden eingereicht, verschlüsselt gespeichert, moderiert und protokolliert", async () => {
    const c = await createCase();
    const mod = await createUser("MODERATOR");
    const res = await submitHint(
      anonymousActor("hint-1"),
      c.publicNumber,
      {
        hintType: "PERSON_SEEN",
        description: "Person ähnlich der Beschreibung am Bahnhof gesehen",
        isAnonymous: false,
        contact: "0170 1234567",
        consent: true,
        website: null,
      },
      [],
    );
    expect(res.status).toBe("NEW");
    const h = await prisma.hint.findUniqueOrThrow({ where: { referenceCode: res.referenceCode } });
    expect(h.contactEnc).not.toContain("1234567");
    expect(JSON.stringify(h.originalPayload)).not.toContain("1234567");

    const detail = await getHint(mod.actor, h.id);
    expect(detail.contact).toBe("0170 1234567");
    expect(await prisma.auditLog.count({ where: { action: "hint.contact_view", entityId: h.id } })).toBe(1);

    await decideHint(mod.actor, h.id, { decision: "DEFER" });
    await decideHint(mod.actor, h.id, { decision: "FORWARD", note: "an Polizei weitergeleitet" });
    const after = await prisma.hint.findUniqueOrThrow({ where: { id: h.id } });
    expect(after.status).toBe("FORWARDED");
    expect(after.lastDecision).toBe("FORWARD");
  });

  it("sind nur für aktive, veröffentlichte Fälle möglich", async () => {
    const draft = await createCase({ published: false });
    const found = await createCase({ status: "FOUND" });
    const input = { hintType: "OTHER" as const, description: "Beschreibung des Hinweises", isAnonymous: true, consent: true, website: null };
    await expect(submitHint(anonymousActor("h2"), draft.publicNumber, input, [])).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(submitHint(anonymousActor("h3"), found.publicNumber, input, [])).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("anonyme Hinweise werden nicht mit dem Konto verknüpft", async () => {
    const c = await createCase();
    const reporter = await createUser("REPORTER");
    const r = await submitHint(reporter.actor, c.publicNumber, {
      hintType: "OTHER", description: "Anonymer Hinweis mit Text", isAnonymous: true, consent: true, website: null,
    }, []);
    const h = await prisma.hint.findUniqueOrThrow({ where: { referenceCode: r.referenceCode } });
    expect(h.reporterId).toBeNull();
  });
});

describe("Suche", () => {
  it("findet über Name (Präfix), Ort, Fallnummer und Quelle – aber nicht über Nachname bei Initial-Stufe", async () => {
    const c = await createCase({ firstName: "Mirabella", lastName: "Verborgen", city: "Hagen" });
    const q = (s: string) => searchPublicCases({ q: s, page: 1, pageSize: 20 }).then((r) => r.total);
    expect(await q("Mira")).toBe(1);
    expect(await q("hagen")).toBe(1);
    expect(await q(c.publicNumber)).toBe(1);
    expect(await q("Polizeimeldung")).toBe(1);
    expect(await q("Verborgen")).toBe(0);
  });

  it("filtert nach Alter, Bundesland, Status und Quelle", async () => {
    await createCase({ age: 30 });
    await createCase({ age: 12, sourceType: "OFFICIAL_AUTHORITY" });
    const r = (q: Parameters<typeof searchPublicCases>[0]) => searchPublicCases(q).then((x) => x.total);
    expect(await r({ ageMin: 18, page: 1, pageSize: 20 })).toBe(1);
    expect(await r({ ageMax: 17, page: 1, pageSize: 20 })).toBe(1);
    expect(await r({ state: "DE-NW", page: 1, pageSize: 20 })).toBe(2);
    expect(await r({ state: "DE-BY", page: 1, pageSize: 20 })).toBe(0);
    expect(await r({ sourceType: "OFFICIAL_AUTHORITY", page: 1, pageSize: 20 })).toBe(1);
    expect(await r({ status: ["FOUND"], page: 1, pageSize: 20 })).toBe(0);
  });
});
