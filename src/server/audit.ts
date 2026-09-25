import "server-only";
import type { Prisma, ReviewEntity, Decision } from "@prisma/client";
import type { Db } from "./db";
import { actorLabel, type Actor } from "./auth/actor";

/** Entfernt Felder, die nie ins Audit-Log gehören (Kontaktdaten, Hashes). */
const REDACT = new Set(["passwordHash", "contactEnc", "tokenHash", "ipHash", "storageKey", "searchVector"]);

export function auditSnapshot<T extends Record<string, unknown>>(obj: T | null | undefined): Prisma.InputJsonValue | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT.has(k)) continue;
    if (v instanceof Date) out[k] = v.toISOString();
    else if (v === undefined) continue;
    else if (typeof v === "object" && v !== null && !Array.isArray(v)) continue; // keine verschachtelten Relationen
    else out[k] = v;
  }
  return out as Prisma.InputJsonValue;
}

/** Nur geänderte Felder (alt/neu) extrahieren. */
export function diffSnapshots(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { oldData: Prisma.InputJsonValue; newData: Prisma.InputJsonValue } | null {
  const oldData: Record<string, unknown> = {};
  const newData: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (REDACT.has(key)) continue;
    const a = normalize(before[key]);
    const b = normalize(after[key]);
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      oldData[key] = a;
      newData[key] = b;
    }
  }
  if (Object.keys(newData).length === 0) return null;
  return { oldData: oldData as Prisma.InputJsonValue, newData: newData as Prisma.InputJsonValue };
}

function normalize(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v === undefined) return null;
  return v;
}

export async function writeAudit(
  db: Db,
  actor: Actor,
  entry: {
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    oldData?: Prisma.InputJsonValue;
    newData?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: actor.user?.id ?? null,
      actorLabel: actorLabel(actor),
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary.slice(0, 1000),
      oldData: entry.oldData,
      newData: entry.newData,
      ipHash: actor.ipHash,
    },
  });
}

export async function writeReviewEvent(
  db: Db,
  actor: Actor,
  entry: {
    entityType: ReviewEntity;
    entityId: string;
    decision: Decision;
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
  },
): Promise<void> {
  await db.reviewEvent.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorId: actor.user?.id ?? null,
      decision: entry.decision,
      fromStatus: entry.fromStatus ?? null,
      toStatus: entry.toStatus ?? null,
      note: entry.note ?? null,
    },
  });
}
