import "server-only";
import type { z } from "zod";
import type {
  locationSchema,
  locationUpdateSchema,
  timelineSchema,
  timelineUpdateSchema,
} from "@/lib/validation/admin";
import { LOCATION_TYPE_LABELS, TIMELINE_EVENT_TYPE_LABELS } from "@/lib/labels";
import { actorLabel, requireStaff, type Actor } from "../auth/actor";
import { auditSnapshot, diffSnapshots, writeAudit } from "../audit";
import { prisma } from "../db";
import { notFound } from "../errors";
import { assertBelongsToCase, loadCaseOrThrow } from "./case-helpers";

// ─────────────────────────────────── Orte ───────────────────────────────────

export async function createLocation(actor: Actor, caseId: string, input: z.infer<typeof locationSchema>) {
  requireStaff(actor, "location.manage");
  return prisma.$transaction(async (tx) => {
    const c = await loadCaseOrThrow(tx, caseId);
    await assertBelongsToCase(tx, caseId, { sourceId: input.sourceId });
    const l = await tx.location.create({
      data: {
        caseId,
        type: input.type,
        label: input.label,
        city: input.city ?? null,
        federalState: input.federalState ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        precisionM: input.precisionM,
        observedAt: input.observedAt ?? null,
        visibility: input.visibility,
        isConfirmed: input.isConfirmed,
        sourceId: input.sourceId ?? null,
      },
    });
    await writeAudit(tx, actor, {
      action: "location.create",
      entityType: "Location",
      entityId: l.id,
      summary: `${actorLabel(actor)} fügte Ort „${l.label}“ (${LOCATION_TYPE_LABELS[l.type]}) zu Fall ${c.publicNumber} hinzu`,
      newData: auditSnapshot(l),
    });
    return l;
  });
}

export async function updateLocation(actor: Actor, id: string, input: z.infer<typeof locationUpdateSchema>) {
  requireStaff(actor, "location.manage");
  return prisma.$transaction(async (tx) => {
    const before = await tx.location.findUnique({ where: { id } });
    if (!before) throw notFound("Ort");
    await assertBelongsToCase(tx, before.caseId, { sourceId: input.sourceId });
    const after = await tx.location.update({ where: { id }, data: input });
    const diff = diffSnapshots(before, after);
    if (diff) {
      await writeAudit(tx, actor, {
        action: "location.update",
        entityType: "Location",
        entityId: id,
        summary: `${actorLabel(actor)} bearbeitete Ort „${after.label}“`,
        ...diff,
      });
    }
    return after;
  });
}

export async function deleteLocation(actor: Actor, id: string) {
  requireStaff(actor, "location.manage");
  return prisma.$transaction(async (tx) => {
    const before = await tx.location.findUnique({ where: { id } });
    if (!before) throw notFound("Ort");
    await tx.location.delete({ where: { id } });
    await writeAudit(tx, actor, {
      action: "location.delete",
      entityType: "Location",
      entityId: id,
      summary: `${actorLabel(actor)} löschte Ort „${before.label}“`,
      oldData: auditSnapshot(before),
    });
    return { ok: true };
  });
}

// ─────────────────────────────── Chronologie ───────────────────────────────

export async function createTimelineEvent(actor: Actor, caseId: string, input: z.infer<typeof timelineSchema>) {
  const user = requireStaff(actor, "timeline.create");
  return prisma.$transaction(async (tx) => {
    const c = await loadCaseOrThrow(tx, caseId);
    await assertBelongsToCase(tx, caseId, { sourceId: input.sourceId, locationId: input.locationId });
    const e = await tx.timelineEvent.create({
      data: {
        caseId,
        type: input.type,
        occurredAt: input.occurredAt,
        description: input.description,
        sourceId: input.sourceId ?? null,
        locationId: input.locationId ?? null,
        visibility: input.visibility,
        createdById: user.id,
      },
    });
    await writeAudit(tx, actor, {
      action: "timeline.create",
      entityType: "TimelineEvent",
      entityId: e.id,
      summary: `${actorLabel(actor)} fügte Ereignis „${TIMELINE_EVENT_TYPE_LABELS[e.type]}“ zu Fall ${c.publicNumber} hinzu`,
      newData: auditSnapshot(e),
    });
    return e;
  });
}

export async function updateTimelineEvent(actor: Actor, id: string, input: z.infer<typeof timelineUpdateSchema>) {
  requireStaff(actor, "timeline.update");
  return prisma.$transaction(async (tx) => {
    const before = await tx.timelineEvent.findUnique({ where: { id } });
    if (!before) throw notFound("Ereignis");
    await assertBelongsToCase(tx, before.caseId, { sourceId: input.sourceId, locationId: input.locationId });
    const after = await tx.timelineEvent.update({ where: { id }, data: input });
    const diff = diffSnapshots(before, after);
    if (diff) {
      await writeAudit(tx, actor, {
        action: "timeline.update",
        entityType: "TimelineEvent",
        entityId: id,
        summary: `${actorLabel(actor)} bearbeitete Ereignis „${TIMELINE_EVENT_TYPE_LABELS[after.type]}“`,
        ...diff,
      });
    }
    return after;
  });
}

export async function deleteTimelineEvent(actor: Actor, id: string) {
  requireStaff(actor, "timeline.delete");
  return prisma.$transaction(async (tx) => {
    const before = await tx.timelineEvent.findUnique({ where: { id } });
    if (!before) throw notFound("Ereignis");
    await tx.timelineEvent.delete({ where: { id } });
    await writeAudit(tx, actor, {
      action: "timeline.delete",
      entityType: "TimelineEvent",
      entityId: id,
      summary: `${actorLabel(actor)} löschte Ereignis „${TIMELINE_EVENT_TYPE_LABELS[before.type]}“`,
      oldData: auditSnapshot(before),
    });
    return { ok: true };
  });
}
