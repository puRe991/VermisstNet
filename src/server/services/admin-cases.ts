import "server-only";
import { Prisma } from "@prisma/client";
import { AUTHORITY_SOURCE_TYPES, type CaseStatusValue } from "@/lib/enums";
import { CASE_STATUS_LABELS } from "@/lib/labels";
import { ageAtMissing, isMinor, publicDisplayName } from "@/lib/person";
import type { CaseCreateInput, CaseUpdateInput } from "@/lib/validation/admin";
import { canTransitionCase } from "@/lib/workflow";
import { can } from "@/lib/permissions";
import { actorLabel, requireStaff, type Actor } from "../auth/actor";
import { auditSnapshot, diffSnapshots, writeAudit, writeReviewEvent } from "../audit";
import { prisma } from "../db";
import { conflict, forbidden, notFound, validation } from "../errors";
import { loadCaseOrThrow, nextPublicNumber, refreshCaseSearch } from "./case-helpers";
import type { Paginated } from "./public-cases";

// ─────────────────────────────── Liste & Detail ───────────────────────────────

export async function listCasesAdmin(
  actor: Actor,
  query: { q?: string; status?: CaseStatusValue; publication?: "DRAFT" | "PUBLISHED" | "UNPUBLISHED"; page: number; pageSize: number },
) {
  requireStaff(actor, "case.read.internal");
  const where: Prisma.CaseWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.publication ? { publicationStatus: query.publication } : {}),
  };
  if (query.q) {
    const q = query.q.trim();
    // Intern: einfache Suche über Fallnummer, Namen, Ort, interne Referenz
    where.OR = [
      { publicNumber: { contains: q, mode: "insensitive" } },
      { missingPlace: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { internalReference: { contains: q, mode: "insensitive" } },
      { person: { firstName: { contains: q, mode: "insensitive" } } },
      { person: { lastName: { contains: q, mode: "insensitive" } } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      select: {
        id: true,
        publicNumber: true,
        status: true,
        publicationStatus: true,
        isUrgent: true,
        missingSince: true,
        missingPlace: true,
        updatedAt: true,
        isDemo: true,
        person: { select: { firstName: true, lastName: true } },
        _count: { select: { hints: { where: { status: { in: ["NEW", "UNDER_REVIEW"] } } } } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    items: rows,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  } satisfies Paginated<(typeof rows)[number]>;
}

export async function getCaseAdmin(actor: Actor, id: string) {
  requireStaff(actor, "case.read.internal");
  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      person: true,
      createdBy: { select: { displayName: true } },
      locations: { orderBy: [{ observedAt: "asc" }, { createdAt: "asc" }], include: { source: { select: { id: true, title: true } } } },
      sources: {
        orderBy: { createdAt: "asc" },
        include: { verifiedBy: { select: { displayName: true } }, createdBy: { select: { displayName: true } } },
      },
      media: {
        where: { caseId: id },
        orderBy: [{ isPrimary: "desc" }, { uploadedAt: "asc" }],
        omit: { storageKey: true },
        include: { uploadedBy: { select: { displayName: true } } },
      },
      timelineEvents: {
        orderBy: { occurredAt: "asc" },
        include: {
          createdBy: { select: { displayName: true } },
          source: { select: { id: true, title: true } },
          location: { select: { id: true, label: true } },
        },
      },
      submission: { select: { id: true, referenceCode: true, status: true } },
      _count: { select: { hints: true, reports: true } },
    },
  });
  if (!c) throw notFound("Fall");
  const history = await prisma.reviewEvent.findMany({
    where: { entityType: "CASE", entityId: id },
    include: { actor: { select: { displayName: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const age = ageAtMissing(c.person, c.missingSince);
  return {
    ...c,
    computed: { age, isMinor: isMinor(age), publicDisplayName: publicDisplayName(c.person) },
    publishCheck: await publishReadiness(id),
    history,
  };
}

// ───────────────────────────── Anlegen & Bearbeiten ─────────────────────────────

export async function createCase(actor: Actor, input: CaseCreateInput): Promise<{ id: string; publicNumber: string }> {
  requireStaff(actor, "case.create");
  return prisma.$transaction(async (tx) => {
    const person = await tx.person.create({
      data: {
        firstName: input.person.firstName,
        lastName: input.person.lastName ?? null,
        birthDate: input.person.birthDate ?? null,
        ageAtMissing: input.person.ageAtMissing ?? null,
        gender: input.person.gender,
        heightCm: input.person.heightCm ?? null,
        build: input.person.build ?? null,
        hairColor: input.person.hairColor ?? null,
        eyeColor: input.person.eyeColor ?? null,
        distinguishingFeatures: input.person.distinguishingFeatures ?? null,
        description: input.person.description ?? null,
        privacyLevel: input.person.privacyLevel,
      },
    });
    const publicNumber = await nextPublicNumber(tx);
    const c = await tx.case.create({
      data: {
        publicNumber,
        personId: person.id,
        missingSince: input.missingSince,
        missingPlace: input.missingPlace,
        lastKnownPlace: input.lastKnownPlace ?? null,
        city: input.city ?? null,
        federalState: input.federalState ?? null,
        circumstances: input.circumstances ?? null,
        clothing: input.clothing ?? null,
        responsibleAuthority: input.responsibleAuthority ?? null,
        authorityContact: input.authorityContact ?? null,
        internalReference: input.internalReference ?? null,
        internalNotes: input.internalNotes ?? null,
        isDemo: input.isDemo,
        createdById: actor.user!.id,
        timelineEvents: {
          create: {
            type: "MISSING",
            occurredAt: input.missingSince,
            description: `Vermisst seit diesem Zeitpunkt (${input.missingPlace}).`,
            visibility: "INTERNAL",
            createdById: actor.user!.id,
          },
        },
      },
    });
    await writeAudit(tx, actor, {
      action: "case.create",
      entityType: "Case",
      entityId: c.id,
      summary: `${actorLabel(actor)} legte Fall ${publicNumber} als Entwurf an`,
      newData: auditSnapshot({ ...c, internalNotes: c.internalNotes ? "[gesetzt]" : null }),
    });
    return { id: c.id, publicNumber };
  });
}

export async function updateCase(actor: Actor, id: string, input: CaseUpdateInput) {
  const user = requireStaff(actor, "case.update");
  if (input.isUrgent !== undefined && !can(user.role, "case.urgent.set")) throw forbidden();
  if (input.status !== undefined && !can(user.role, "case.status.change")) throw forbidden();

  return prisma.$transaction(async (tx) => {
    const before = await loadCaseOrThrow(tx, id);
    const { person: personInput, status, isUrgent, statusNote, ...caseInput } = input;

    const caseData: Prisma.CaseUpdateInput = { ...caseInput };
    if (isUrgent !== undefined) caseData.isUrgent = isUrgent;

    if (status !== undefined && status !== before.status) {
      if (!canTransitionCase(before.status, status)) {
        throw conflict(`Statuswechsel von ${CASE_STATUS_LABELS[before.status]} zu ${CASE_STATUS_LABELS[status]} nicht zulässig`);
      }
      caseData.status = status;
      caseData.closedAt = status === "ACTIVE" ? null : new Date();
      if (status !== "ACTIVE") caseData.isUrgent = false; // Dringlichkeit endet mit der aktiven Suche
    }

    const after = await tx.case.update({ where: { id }, data: caseData });
    let personAfter = before.person;
    if (personInput && Object.keys(personInput).length > 0) {
      personAfter = await tx.person.update({ where: { id: before.personId }, data: personInput });
    }

    // Statuswechsel → Chronologie + Verlauf + eigener Audit-Eintrag
    if (status !== undefined && status !== before.status) {
      const summary = `${actorLabel(actor)} änderte Status von ${before.status} auf ${status}`;
      await tx.timelineEvent.create({
        data: {
          caseId: id,
          type: status === "FOUND" ? "FOUND" : "STATUS_CHANGE",
          occurredAt: new Date(),
          description:
            status === "FOUND"
              ? "Die Person wurde gefunden. Die öffentliche Suche ist beendet."
              : `Status geändert: ${CASE_STATUS_LABELS[status]}${statusNote ? ` – ${statusNote}` : ""}`,
          // Fund/Abschluss öffentlich kommunizieren, andere Statuswechsel intern
          visibility: status === "FOUND" || status === "CLOSED" ? "PUBLIC" : "INTERNAL",
          createdById: user.id,
        },
      });
      await writeReviewEvent(tx, actor, {
        entityType: "CASE",
        entityId: id,
        decision: "NOTE",
        fromStatus: before.status,
        toStatus: status,
        note: statusNote ?? null,
      });
      await writeAudit(tx, actor, {
        action: "case.status_change",
        entityType: "Case",
        entityId: id,
        summary,
        oldData: { status: before.status },
        newData: { status },
      });
    }

    const { person: _p, ...beforeCase } = before;
    const caseDiff = diffSnapshots(beforeCase, after);
    const personDiff = diffSnapshots(before.person, personAfter);
    if (caseDiff || personDiff) {
      await writeAudit(tx, actor, {
        action: "case.update",
        entityType: "Case",
        entityId: id,
        summary: `${actorLabel(actor)} bearbeitete Fall ${before.publicNumber}`,
        oldData: { case: caseDiff?.oldData ?? {}, person: personDiff?.oldData ?? {} } as Prisma.InputJsonValue,
        newData: { case: caseDiff?.newData ?? {}, person: personDiff?.newData ?? {} } as Prisma.InputJsonValue,
      });
    }
    await refreshCaseSearch(tx, id);
    return { id, status: after.status };
  });
}

// ───────────────────────────── Veröffentlichung ─────────────────────────────

export type PublishReadiness = { ok: boolean; problems: string[] };

/** Pflichtprüfungen vor der Veröffentlichung (docs/ARCHITECTURE.md §6.2). */
export async function publishReadiness(caseId: string): Promise<PublishReadiness> {
  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      status: true,
      missingSince: true,
      person: { select: { birthDate: true, ageAtMissing: true } },
      sources: { where: { verifiedAt: { not: null } }, select: { sourceType: true } },
    },
  });
  if (!c) return { ok: false, problems: ["Fall nicht gefunden"] };
  const problems: string[] = [];
  if (c.status === "ARCHIVED") problems.push("Archivierte Fälle können nicht veröffentlicht werden.");
  if (c.sources.length === 0) problems.push("Mindestens eine verifizierte Quelle ist erforderlich.");
  const minor = isMinor(ageAtMissing(c.person, c.missingSince));
  if (minor && !c.sources.some((s) => AUTHORITY_SOURCE_TYPES.includes(s.sourceType))) {
    problems.push(
      "Bei Minderjährigen (oder unbekanntem Alter) ist eine verifizierte Quelle von Polizei oder Behörde erforderlich.",
    );
  }
  return { ok: problems.length === 0, problems };
}

export async function publishCase(actor: Actor, id: string) {
  requireStaff(actor, "case.publish");
  const readiness = await publishReadiness(id);
  if (!readiness.ok) throw conflict(readiness.problems.join(" "));
  return prisma.$transaction(async (tx) => {
    const before = await loadCaseOrThrow(tx, id);
    if (before.publicationStatus === "PUBLISHED") throw conflict("Fall ist bereits veröffentlicht");
    const after = await tx.case.update({
      where: { id },
      data: { publicationStatus: "PUBLISHED", publishedAt: before.publishedAt ?? new Date() },
    });
    await tx.caseSubmission.updateMany({ where: { caseId: id, status: "APPROVED" }, data: { status: "PUBLISHED" } });
    await writeReviewEvent(tx, actor, {
      entityType: "CASE",
      entityId: id,
      decision: "CONFIRM",
      fromStatus: before.publicationStatus,
      toStatus: "PUBLISHED",
    });
    await writeAudit(tx, actor, {
      action: "case.publish",
      entityType: "Case",
      entityId: id,
      summary: `${actorLabel(actor)} veröffentlichte Fall ${before.publicNumber}`,
      oldData: { publicationStatus: before.publicationStatus },
      newData: { publicationStatus: after.publicationStatus, publishedAt: after.publishedAt?.toISOString() ?? null },
    });
    await refreshCaseSearch(tx, id);
    return { id, publicationStatus: after.publicationStatus };
  });
}

export async function unpublishCase(actor: Actor, id: string, note?: string | null) {
  requireStaff(actor, "case.publish");
  return prisma.$transaction(async (tx) => {
    const before = await loadCaseOrThrow(tx, id);
    if (before.publicationStatus !== "PUBLISHED") throw validation("Fall ist nicht veröffentlicht");
    await tx.case.update({ where: { id }, data: { publicationStatus: "UNPUBLISHED" } });
    await writeReviewEvent(tx, actor, {
      entityType: "CASE",
      entityId: id,
      decision: "REJECT",
      fromStatus: "PUBLISHED",
      toStatus: "UNPUBLISHED",
      note: note ?? null,
    });
    await writeAudit(tx, actor, {
      action: "case.unpublish",
      entityType: "Case",
      entityId: id,
      summary: `${actorLabel(actor)} zog Fall ${before.publicNumber} zurück`,
      oldData: { publicationStatus: "PUBLISHED" },
      newData: { publicationStatus: "UNPUBLISHED" },
    });
    await refreshCaseSearch(tx, id);
    return { id, publicationStatus: "UNPUBLISHED" as const };
  });
}

// Für die interne Suche (Hinweise/Meldungen einem Fall zuordnen)
export async function findCaseIdByNumber(publicNumber: string): Promise<string | null> {
  const row = await prisma.case.findUnique({ where: { publicNumber: publicNumber.toUpperCase() }, select: { id: true } });
  return row?.id ?? null;
}
