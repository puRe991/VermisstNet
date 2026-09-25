import "server-only";
import type { Db } from "../db";
import { notFound, validation } from "../errors";

/** Suchindex eines Falls neu aufbauen (nur öffentliche Felder, siehe SQL-Funktion). */
export async function refreshCaseSearch(db: Db, caseId: string): Promise<void> {
  await db.$executeRaw`SELECT refresh_case_search(${caseId}::uuid)`;
}

/** Nächste öffentliche Fallnummer, z. B. VA-2026-000042 (atomar). */
export async function nextPublicNumber(db: Db, now = new Date()): Promise<string> {
  const year = now.getUTCFullYear();
  const name = `case_number_${year}`;
  const rows = await db.$queryRaw<{ value: number }[]>`
    INSERT INTO "counters" ("name", "value") VALUES (${name}, 1)
    ON CONFLICT ("name") DO UPDATE SET "value" = "counters"."value" + 1
    RETURNING "value"`;
  const value = rows[0]?.value ?? 1;
  return `VA-${year}-${String(value).padStart(6, "0")}`;
}

export async function loadCaseOrThrow(db: Db, caseId: string) {
  const c = await db.case.findUnique({ where: { id: caseId }, include: { person: true } });
  if (!c) throw notFound("Fall");
  return c;
}

/** Stellt sicher, dass referenzierte Quelle/Ort zum selben Fall gehören (verhindert IDOR über Fremd-IDs). */
export async function assertBelongsToCase(
  db: Db,
  caseId: string,
  refs: { sourceId?: string | null; locationId?: string | null },
): Promise<void> {
  if (refs.sourceId) {
    const s = await db.source.findFirst({ where: { id: refs.sourceId, caseId }, select: { id: true } });
    if (!s) throw validation("Quelle gehört nicht zu diesem Fall", { sourceId: ["Ungültige Quelle"] });
  }
  if (refs.locationId) {
    const l = await db.location.findFirst({ where: { id: refs.locationId, caseId }, select: { id: true } });
    if (!l) throw validation("Ort gehört nicht zu diesem Fall", { locationId: ["Ungültiger Ort"] });
  }
}
