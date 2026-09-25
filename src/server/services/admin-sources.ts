import "server-only";
import type { z } from "zod";
import type { sourceSchema, sourceUpdateSchema, sourceVerifySchema } from "@/lib/validation/admin";
import { actorLabel, requireStaff, type Actor } from "../auth/actor";
import { auditSnapshot, diffSnapshots, writeAudit, writeReviewEvent } from "../audit";
import { prisma } from "../db";
import { notFound } from "../errors";
import { loadCaseOrThrow, refreshCaseSearch } from "./case-helpers";

type SourceInput = z.infer<typeof sourceSchema>;

/** Änderungen an diesen Feldern heben eine bestehende Verifizierung auf (Datenintegrität). */
const VERIFICATION_RELEVANT = ["sourceType", "organization", "title", "url", "publicationDate"] as const;

export async function createSource(actor: Actor, caseId: string, input: SourceInput) {
  const user = requireStaff(actor, "source.create");
  return prisma.$transaction(async (tx) => {
    const c = await loadCaseOrThrow(tx, caseId);
    const s = await tx.source.create({
      data: {
        caseId,
        sourceType: input.sourceType,
        organization: input.organization ?? null,
        title: input.title,
        url: input.url ?? null,
        publicationDate: input.publicationDate ?? null,
        notes: input.notes ?? null,
        createdById: user.id,
      },
    });
    await writeAudit(tx, actor, {
      action: "source.create",
      entityType: "Source",
      entityId: s.id,
      summary: `${actorLabel(actor)} fügte Quelle „${s.title}“ zu Fall ${c.publicNumber} hinzu`,
      newData: auditSnapshot(s),
    });
    return s;
  });
}

export async function updateSource(actor: Actor, id: string, input: z.infer<typeof sourceUpdateSchema>) {
  requireStaff(actor, "source.update");
  return prisma.$transaction(async (tx) => {
    const before = await tx.source.findUnique({ where: { id } });
    if (!before) throw notFound("Quelle");
    const resetVerification =
      before.verifiedAt !== null &&
      VERIFICATION_RELEVANT.some((k) => input[k] !== undefined && String(input[k] ?? "") !== String(before[k] ?? ""));
    const after = await tx.source.update({
      where: { id },
      data: { ...input, ...(resetVerification ? { verifiedAt: null, verifiedById: null } : {}) },
    });
    const diff = diffSnapshots(before, after);
    if (diff) {
      await writeAudit(tx, actor, {
        action: "source.update",
        entityType: "Source",
        entityId: id,
        summary: `${actorLabel(actor)} bearbeitete Quelle „${after.title}“${resetVerification ? " (Verifizierung zurückgesetzt)" : ""}`,
        ...diff,
      });
    }
    await refreshCaseSearch(tx, after.caseId);
    return after;
  });
}

export async function verifySource(actor: Actor, id: string, input: z.infer<typeof sourceVerifySchema>) {
  const user = requireStaff(actor, "source.verify");
  return prisma.$transaction(async (tx) => {
    const before = await tx.source.findUnique({ where: { id } });
    if (!before) throw notFound("Quelle");
    const after = await tx.source.update({
      where: { id },
      data: input.verified ? { verifiedAt: new Date(), verifiedById: user.id } : { verifiedAt: null, verifiedById: null },
    });
    await writeReviewEvent(tx, actor, {
      entityType: "SOURCE",
      entityId: id,
      decision: input.verified ? "CONFIRM" : "REJECT",
      fromStatus: before.verifiedAt ? "VERIFIED" : "UNVERIFIED",
      toStatus: input.verified ? "VERIFIED" : "UNVERIFIED",
      note: input.note ?? null,
    });
    await writeAudit(tx, actor, {
      action: input.verified ? "source.verify" : "source.unverify",
      entityType: "Source",
      entityId: id,
      summary: `${actorLabel(actor)} ${input.verified ? "verifizierte" : "entzog die Verifizierung von"} Quelle „${after.title}“`,
      oldData: { verifiedAt: before.verifiedAt?.toISOString() ?? null },
      newData: { verifiedAt: after.verifiedAt?.toISOString() ?? null },
    });
    await refreshCaseSearch(tx, after.caseId);
    return after;
  });
}

export async function deleteSource(actor: Actor, id: string) {
  requireStaff(actor, "source.delete");
  return prisma.$transaction(async (tx) => {
    const before = await tx.source.findUnique({ where: { id } });
    if (!before) throw notFound("Quelle");
    await tx.source.delete({ where: { id } });
    await writeAudit(tx, actor, {
      action: "source.delete",
      entityType: "Source",
      entityId: id,
      summary: `${actorLabel(actor)} löschte Quelle „${before.title}“`,
      oldData: auditSnapshot(before),
    });
    await refreshCaseSearch(tx, before.caseId);
    return { ok: true };
  });
}

/** Zu prüfende (unverifizierte) Quellen für das Moderationsdashboard. */
export async function listSourcesAdmin(actor: Actor, opts: { verified?: boolean; page: number; pageSize: number }) {
  requireStaff(actor, "source.verify");
  const where = opts.verified === undefined ? {} : opts.verified ? { verifiedAt: { not: null } } : { verifiedAt: null };
  const [total, items] = await Promise.all([
    prisma.source.count({ where }),
    prisma.source.findMany({
      where,
      include: {
        case: { select: { id: true, publicNumber: true, publicationStatus: true } },
        createdBy: { select: { displayName: true } },
      },
      orderBy: { createdAt: "asc" },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
    }),
  ]);
  return { items, total, page: opts.page, pageSize: opts.pageSize, totalPages: Math.max(1, Math.ceil(total / opts.pageSize)) };
}
