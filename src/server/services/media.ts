import "server-only";
import type { z } from "zod";
import type { mediaUpdateSchema, mediaUploadSchema } from "@/lib/validation/admin";
import { can } from "@/lib/permissions";
import { actorLabel, actorRole, requireStaff, type Actor } from "../auth/actor";
import { auditSnapshot, diffSnapshots, writeAudit, writeReviewEvent } from "../audit";
import { prisma } from "../db";
import { conflict, notFound } from "../errors";
import { RATE_LIMITS, enforceRateLimit } from "../security/rate-limit";
import { storage, thumbKey } from "../storage";
import { assertBelongsToCase, loadCaseOrThrow } from "./case-helpers";
import { storeUploads } from "./uploads";

export async function uploadCaseMedia(actor: Actor, input: z.infer<typeof mediaUploadSchema>, file: File) {
  const user = requireStaff(actor, "media.upload");
  await enforceRateLimit(RATE_LIMITS.upload, `u:${user.id}`);
  const c = await loadCaseOrThrow(prisma, input.caseId);
  await assertBelongsToCase(prisma, c.id, { sourceId: input.sourceId });
  const { uploads, cleanup } = await storeUploads([file], { allowVideo: false, keyPrefix: "cases", maxFiles: 1 });
  const up = uploads[0]!;
  try {
    return await prisma.$transaction(async (tx) => {
      const m = await tx.media.create({
        data: {
          caseId: c.id,
          storageKey: up.storageKey,
          mimeType: up.mimeType,
          sizeBytes: up.data.length,
          width: up.width,
          height: up.height,
          sha256: up.sha256,
          hasThumbnail: !!up.thumb,
          mediaType: input.mediaType,
          title: input.title ?? null,
          sourceText: input.sourceText ?? null,
          sourceId: input.sourceId ?? null,
          copyrightStatus: input.copyrightStatus,
          // Neue Dateien sind nie direkt öffentlich
          visibility: "INTERNAL",
          reviewStatus: "PENDING",
          uploadedById: user.id,
        },
        omit: { storageKey: true },
      });
      await writeAudit(tx, actor, {
        action: "media.upload",
        entityType: "Media",
        entityId: m.id,
        summary: `${actorLabel(actor)} lud ein Bild zu Fall ${c.publicNumber} hoch`,
        newData: auditSnapshot(m),
      });
      return m;
    });
  } catch (err) {
    await cleanup();
    throw err;
  }
}

export async function updateMedia(actor: Actor, id: string, input: z.infer<typeof mediaUpdateSchema>) {
  requireStaff(actor, "media.manage");
  return prisma.$transaction(async (tx) => {
    const before = await tx.media.findUnique({ where: { id }, omit: { storageKey: true } });
    if (!before || !before.caseId) throw notFound("Medium");
    await assertBelongsToCase(tx, before.caseId, { sourceId: input.sourceId });

    const next = { ...before, ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) };
    if (next.visibility === "PUBLIC" && next.reviewStatus === "APPROVED" && next.copyrightStatus === "UNKNOWN") {
      throw conflict("Bilder mit ungeklärtem Urheberrecht dürfen nicht veröffentlicht werden");
    }
    if (next.visibility === "PUBLIC" && next.mediaType === "VIDEO") {
      throw conflict("Videos werden im MVP nicht veröffentlicht");
    }
    if (input.isPrimary) {
      await tx.media.updateMany({ where: { caseId: before.caseId, id: { not: id } }, data: { isPrimary: false } });
    }
    const after = await tx.media.update({ where: { id }, data: input, omit: { storageKey: true } });
    if (input.reviewStatus && input.reviewStatus !== before.reviewStatus) {
      await writeReviewEvent(tx, actor, {
        entityType: "MEDIA",
        entityId: id,
        decision: input.reviewStatus === "APPROVED" ? "CONFIRM" : input.reviewStatus === "REJECTED" ? "REJECT" : "DEFER",
        fromStatus: before.reviewStatus,
        toStatus: input.reviewStatus,
      });
    }
    const diff = diffSnapshots(before, after);
    if (diff) {
      await writeAudit(tx, actor, {
        action: "media.update",
        entityType: "Media",
        entityId: id,
        summary: `${actorLabel(actor)} änderte Medium (${Object.keys(diff.newData as object).join(", ")})`,
        ...diff,
      });
    }
    return after;
  });
}

export async function deleteMedia(actor: Actor, id: string) {
  requireStaff(actor, "media.manage");
  const before = await prisma.media.findUnique({ where: { id } });
  if (!before) throw notFound("Medium");
  await prisma.$transaction(async (tx) => {
    await tx.media.delete({ where: { id } });
    await writeAudit(tx, actor, {
      action: "media.delete",
      entityType: "Media",
      entityId: id,
      summary: `${actorLabel(actor)} löschte ein Medium`,
      oldData: auditSnapshot(before),
    });
  });
  await storage().delete(before.storageKey).catch(() => undefined);
  if (before.hasThumbnail) await storage().delete(thumbKey(before.storageKey)).catch(() => undefined);
  return { ok: true };
}

/**
 * Autorisierte Dateiauslieferung.
 * Öffentlich nur: freigegeben + PUBLIC + Urheberrecht geklärt + Bild + Fall veröffentlicht & ACTIVE.
 * Alles andere nur für moderator+ (Hinweis-Anhänge, Meldungsbilder, Entwürfe).
 */
export async function getMediaFile(
  actor: Actor,
  id: string,
  variant: "full" | "thumb",
): Promise<{ data: Buffer; mimeType: string; isPublic: boolean; isVideo: boolean }> {
  const m = await prisma.media.findUnique({
    where: { id },
    include: { case: { select: { publicationStatus: true, status: true } } },
  });
  if (!m) throw notFound("Datei");
  const isPublic =
    m.visibility === "PUBLIC" &&
    m.reviewStatus === "APPROVED" &&
    m.copyrightStatus !== "UNKNOWN" &&
    m.mediaType !== "VIDEO" &&
    m.case?.publicationStatus === "PUBLISHED" &&
    m.case.status === "ACTIVE";

  // Für Unberechtigte ist ein nicht öffentliches Medium "nicht vorhanden"
  if (!isPublic && !can(actorRole(actor), "media.read.internal")) throw notFound("Datei");

  const key = variant === "thumb" && m.hasThumbnail ? thumbKey(m.storageKey) : m.storageKey;
  const data = await storage().get(key);
  if (!data) throw notFound("Datei");
  return { data, mimeType: m.mimeType, isPublic, isVideo: m.mediaType === "VIDEO" };
}
