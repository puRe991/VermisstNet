import "server-only";
import type { HintStatus, Prisma, ReportStatus, SubmissionStatus } from "@prisma/client";
import { DECISION_LABELS, HINT_STATUS_LABELS, SUBMISSION_STATUS_LABELS } from "@/lib/labels";
import type { DecisionInput } from "@/lib/validation/admin";
import { nextHintStatus, nextReportStatus, nextSubmissionStatus } from "@/lib/workflow";
import { actorLabel, requireStaff, type Actor } from "../auth/actor";
import { writeAudit, writeReviewEvent } from "../audit";
import { prisma } from "../db";
import { conflict, notFound } from "../errors";
import { decryptField } from "../security/crypto";
import { storage, thumbKey } from "../storage";
import { nextPublicNumber } from "./case-helpers";

const mediaOmit = { storageKey: true } as const;

function history(entityType: "HINT" | "SUBMISSION" | "REPORT", entityId: string) {
  return prisma.reviewEvent.findMany({
    where: { entityType, entityId },
    include: { actor: { select: { displayName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
}

function page(total: number, p: number, size: number) {
  return { total, page: p, pageSize: size, totalPages: Math.max(1, Math.ceil(total / size)) };
}

// ═══════════════════════════════════ Hinweise ═══════════════════════════════════

export async function listHints(actor: Actor, q: { status?: HintStatus; case?: string; page: number; pageSize: number }) {
  requireStaff(actor, "hint.read");
  const where: Prisma.HintWhereInput = {
    ...(q.status ? { status: q.status } : { status: { not: "ARCHIVED" } }),
    ...(q.case ? { case: { publicNumber: q.case.toUpperCase() } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.hint.count({ where }),
    prisma.hint.findMany({
      where,
      select: {
        id: true,
        referenceCode: true,
        hintType: true,
        status: true,
        lastDecision: true,
        observedDate: true,
        locationText: true,
        isAnonymous: true,
        createdAt: true,
        description: true,
        case: { select: { id: true, publicNumber: true } },
        assignee: { select: { displayName: true } },
        _count: { select: { attachments: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return { items, ...page(total, q.page, q.pageSize) };
}

/** Moderationsansicht inkl. entschlüsseltem Kontakt. Der Zugriff auf Kontaktdaten wird protokolliert. */
export async function getHint(actor: Actor, id: string) {
  requireStaff(actor, "hint.read");
  const h = await prisma.hint.findUnique({
    where: { id },
    include: {
      case: { select: { id: true, publicNumber: true, status: true, person: { select: { firstName: true, lastName: true } } } },
      reporter: { select: { displayName: true, email: true } },
      assignee: { select: { displayName: true } },
      attachments: { omit: mediaOmit },
    },
  });
  if (!h) throw notFound("Hinweis");
  let contact: string | null = null;
  if (h.contactEnc) {
    requireStaff(actor, "hint.contact.read");
    contact = decryptField(h.contactEnc);
    await writeAudit(prisma, actor, {
      action: "hint.contact_view",
      entityType: "Hint",
      entityId: id,
      summary: `${actorLabel(actor)} sah die Kontaktdaten zu Hinweis ${h.referenceCode} ein`,
    });
  }
  const { contactEnc: _c, ipHash: _i, ...rest } = h;
  return { ...rest, contact, history: await history("HINT", id) };
}

export async function decideHint(actor: Actor, id: string, input: DecisionInput) {
  const user = requireStaff(actor, "hint.moderate");
  return prisma.$transaction(async (tx) => {
    const h = await tx.hint.findUnique({ where: { id }, select: { id: true, status: true, referenceCode: true } });
    if (!h) throw notFound("Hinweis");
    const next = nextHintStatus(h.status, input.decision);
    if (!next) {
      throw conflict(`„${DECISION_LABELS[input.decision]}“ ist im Status „${HINT_STATUS_LABELS[h.status]}“ nicht möglich`);
    }
    await tx.hint.update({
      where: { id },
      data: {
        status: next,
        lastDecision: input.decision === "NOTE" ? undefined : input.decision,
        ...(input.assignToMe ? { assigneeId: user.id } : {}),
      },
    });
    await writeReviewEvent(tx, actor, {
      entityType: "HINT",
      entityId: id,
      decision: input.decision,
      fromStatus: h.status,
      toStatus: next,
      note: input.note ?? null,
    });
    await writeAudit(tx, actor, {
      action: "hint.decision",
      entityType: "Hint",
      entityId: id,
      summary:
        next === h.status
          ? `${actorLabel(actor)}: ${DECISION_LABELS[input.decision]} zu Hinweis ${h.referenceCode}`
          : `${actorLabel(actor)} änderte Status von Hinweis ${h.referenceCode} von ${h.status} auf ${next}`,
      oldData: { status: h.status },
      newData: { status: next, decision: input.decision },
    });
    return { id, status: next };
  });
}

// ════════════════════════════════ Fallmeldungen ════════════════════════════════

export async function listSubmissions(actor: Actor, q: { status?: SubmissionStatus; page: number; pageSize: number }) {
  requireStaff(actor, "submission.read");
  const where: Prisma.CaseSubmissionWhereInput = q.status ? { status: q.status } : {};
  const [total, items] = await Promise.all([
    prisma.caseSubmission.count({ where }),
    prisma.caseSubmission.findMany({
      where,
      select: {
        id: true,
        referenceCode: true,
        status: true,
        lastDecision: true,
        personName: true,
        age: true,
        missingSince: true,
        missingPlace: true,
        createdAt: true,
        case: { select: { id: true, publicNumber: true } },
        _count: { select: { attachments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return { items, ...page(total, q.page, q.pageSize) };
}

export async function getSubmission(actor: Actor, id: string) {
  requireStaff(actor, "submission.read");
  const s = await prisma.caseSubmission.findUnique({
    where: { id },
    include: {
      case: { select: { id: true, publicNumber: true, publicationStatus: true } },
      reporter: { select: { displayName: true, email: true } },
      assignee: { select: { displayName: true } },
      attachments: { omit: mediaOmit },
    },
  });
  if (!s) throw notFound("Meldung");
  let contact: string | null = null;
  if (s.contactEnc) {
    contact = decryptField(s.contactEnc);
    await writeAudit(prisma, actor, {
      action: "submission.contact_view",
      entityType: "CaseSubmission",
      entityId: id,
      summary: `${actorLabel(actor)} sah die Kontaktdaten zu Meldung ${s.referenceCode} ein`,
    });
  }
  const { contactEnc: _c, ipHash: _i, ...rest } = s;
  return { ...rest, contact, history: await history("SUBMISSION", id) };
}

/** Name aus der Meldung aufteilen: "Erika Mustermann" → Vorname/Nachname */
function splitName(full: string): { firstName: string; lastName: string | null } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: null };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1]! };
}

/**
 * Entscheidung zu einer Fallmeldung. CONFIRM im Schritt SOURCE_VERIFICATION → APPROVED
 * erzeugt einen Fallentwurf (DRAFT) – veröffentlicht wird er erst durch einen Redakteur.
 */
export async function decideSubmission(actor: Actor, id: string, input: DecisionInput) {
  const user = requireStaff(actor, "submission.moderate");
  return prisma.$transaction(async (tx) => {
    const s = await tx.caseSubmission.findUnique({ where: { id }, include: { attachments: { select: { id: true } } } });
    if (!s) throw notFound("Meldung");
    const next = nextSubmissionStatus(s.status, input.decision);
    if (!next) {
      throw conflict(
        `„${DECISION_LABELS[input.decision]}“ ist im Status „${SUBMISSION_STATUS_LABELS[s.status]}“ nicht möglich`,
      );
    }

    let createdCase: { id: string; publicNumber: string } | null = null;
    if (next === "APPROVED" && !s.caseId) {
      const name = splitName(s.personName);
      const publicNumber = await nextPublicNumber(tx);
      const c = await tx.case.create({
        data: {
          publicNumber,
          person: {
            create: {
              ...name,
              ageAtMissing: s.age,
              gender: s.gender,
              description: s.description,
              privacyLevel: "FIRST_NAME_INITIAL" as const,
            },
          },
          missingSince: s.missingSince,
          missingPlace: s.missingPlace,
          circumstances: s.circumstances,
          createdBy: { connect: { id: user.id } },
          internalNotes: `Aus Meldung ${s.referenceCode} übernommen. Angaben vor Veröffentlichung prüfen.`,
          sources: {
            create: {
              sourceType: "USER_REPORT",
              title: s.sourceText.slice(0, 300),
              url: s.sourceUrl,
              notes: `Quelle aus Meldung ${s.referenceCode}`,
              createdById: user.id,
            },
          },
          timelineEvents: {
            create: {
              type: "MISSING",
              occurredAt: s.missingSince,
              description: `Vermisst seit diesem Zeitpunkt (${s.missingPlace}).`,
              visibility: "INTERNAL",
              createdById: user.id,
            },
          },
        },
      });
      // Suchbild der Meldung wird dem Entwurf zugeordnet (bleibt PENDING/INTERNAL)
      if (s.attachments.length) {
        await tx.media.updateMany({
          where: { submissionId: id },
          data: { caseId: c.id, mediaType: "SEARCH_IMAGE" },
        });
      }
      createdCase = { id: c.id, publicNumber };
    }

    await tx.caseSubmission.update({
      where: { id },
      data: {
        status: next,
        lastDecision: input.decision === "NOTE" ? undefined : input.decision,
        ...(createdCase ? { caseId: createdCase.id } : {}),
        ...(input.assignToMe ? { assigneeId: user.id } : {}),
      },
    });
    await writeReviewEvent(tx, actor, {
      entityType: "SUBMISSION",
      entityId: id,
      decision: input.decision,
      fromStatus: s.status,
      toStatus: next,
      note: input.note ?? null,
    });
    await writeAudit(tx, actor, {
      action: "submission.decision",
      entityType: "CaseSubmission",
      entityId: id,
      summary:
        `${actorLabel(actor)}: ${DECISION_LABELS[input.decision]} zu Meldung ${s.referenceCode}` +
        (next !== s.status ? ` (${s.status} → ${next})` : "") +
        (createdCase ? `, Fallentwurf ${createdCase.publicNumber} angelegt` : ""),
      oldData: { status: s.status },
      newData: { status: next, decision: input.decision, caseId: createdCase?.id ?? null },
    });
    return { id, status: next, case: createdCase };
  });
}

// ═══════════════════════════════ Gemeldete Inhalte ═══════════════════════════════

export async function listReports(actor: Actor, q: { status?: ReportStatus; page: number; pageSize: number }) {
  requireStaff(actor, "report.moderate");
  const where: Prisma.ContentReportWhereInput = q.status ? { status: q.status } : { status: { in: ["OPEN", "IN_PROGRESS"] } };
  const [total, items] = await Promise.all([
    prisma.contentReport.count({ where }),
    prisma.contentReport.findMany({
      where,
      omit: { contactEnc: true, ipHash: true },
      include: { case: { select: { id: true, publicNumber: true } } },
      orderBy: { createdAt: "asc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return { items, ...page(total, q.page, q.pageSize) };
}

export async function getReport(actor: Actor, id: string) {
  requireStaff(actor, "report.moderate");
  const r = await prisma.contentReport.findUnique({
    where: { id },
    include: { case: { select: { id: true, publicNumber: true } } },
  });
  if (!r) throw notFound("Meldung");
  let contact: string | null = null;
  if (r.contactEnc) {
    contact = decryptField(r.contactEnc);
    await writeAudit(prisma, actor, {
      action: "report.contact_view",
      entityType: "ContentReport",
      entityId: id,
      summary: `${actorLabel(actor)} sah Kontaktdaten zu einem gemeldeten Inhalt ein`,
    });
  }
  const { contactEnc: _c, ipHash: _i, ...rest } = r;
  return { ...rest, contact, history: await history("REPORT", id) };
}

export async function decideReport(actor: Actor, id: string, input: DecisionInput) {
  requireStaff(actor, "report.moderate");
  return prisma.$transaction(async (tx) => {
    const r = await tx.contentReport.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!r) throw notFound("Meldung");
    const next = nextReportStatus(r.status, input.decision);
    if (!next) throw conflict("Entscheidung im aktuellen Status nicht möglich");
    await tx.contentReport.update({
      where: { id },
      data: { status: next, lastDecision: input.decision === "NOTE" ? undefined : input.decision },
    });
    await writeReviewEvent(tx, actor, {
      entityType: "REPORT",
      entityId: id,
      decision: input.decision,
      fromStatus: r.status,
      toStatus: next,
      note: input.note ?? null,
    });
    await writeAudit(tx, actor, {
      action: "report.decision",
      entityType: "ContentReport",
      entityId: id,
      summary: `${actorLabel(actor)}: ${DECISION_LABELS[input.decision]} zu gemeldetem Inhalt (${r.status} → ${next})`,
      oldData: { status: r.status },
      newData: { status: next },
    });
    return { id, status: next };
  });
}

// ═════════════════════════ Löschung personenbezogener Daten ═════════════════════════

async function deleteFiles(media: { storageKey: string; hasThumbnail: boolean }[]) {
  for (const m of media) {
    await storage().delete(m.storageKey).catch(() => undefined);
    if (m.hasThumbnail) await storage().delete(thumbKey(m.storageKey)).catch(() => undefined);
  }
}

/** Entfernt Kontaktdaten, IP-Hash, Freitext-Originaleingabe und Anhänge eines Hinweises. */
export async function eraseHintPersonalData(actor: Actor, id: string) {
  requireStaff(actor, "personal_data.erase");
  const h = await prisma.hint.findUnique({ where: { id }, include: { attachments: true } });
  if (!h) throw notFound("Hinweis");
  await prisma.$transaction(async (tx) => {
    await tx.media.deleteMany({ where: { hintId: id } });
    await tx.hint.update({
      where: { id },
      data: {
        contactEnc: null,
        ipHash: null,
        reporterId: null,
        latitude: null,
        longitude: null,
        description: "[gelöscht]",
        locationText: null,
        originalPayload: { erased: true },
        personalDataErasedAt: new Date(),
        status: "ARCHIVED",
      },
    });
    await writeAudit(tx, actor, {
      action: "hint.erase",
      entityType: "Hint",
      entityId: id,
      summary: `${actorLabel(actor)} löschte personenbezogene Daten zu Hinweis ${h.referenceCode}`,
    });
  });
  await deleteFiles(h.attachments);
  return { ok: true };
}

export async function eraseSubmissionPersonalData(actor: Actor, id: string) {
  requireStaff(actor, "personal_data.erase");
  const s = await prisma.caseSubmission.findUnique({ where: { id }, include: { attachments: true } });
  if (!s) throw notFound("Meldung");
  // Bilder, die bereits einem Fall zugeordnet sind, gehören zum Fall und bleiben erhalten
  const orphaned = s.attachments.filter((m) => !m.caseId);
  await prisma.$transaction(async (tx) => {
    await tx.media.deleteMany({ where: { submissionId: id, caseId: null } });
    await tx.media.updateMany({ where: { submissionId: id }, data: { submissionId: null } });
    await tx.caseSubmission.update({
      where: { id },
      data: {
        contactEnc: null,
        ipHash: null,
        reporterId: null,
        description: null,
        circumstances: null,
        originalPayload: { erased: true },
        personalDataErasedAt: new Date(),
        ...(s.status === "PUBLISHED" || s.status === "APPROVED" ? {} : { status: "REJECTED" }),
      },
    });
    await writeAudit(tx, actor, {
      action: "submission.erase",
      entityType: "CaseSubmission",
      entityId: id,
      summary: `${actorLabel(actor)} löschte personenbezogene Daten zu Meldung ${s.referenceCode}`,
    });
  });
  await deleteFiles(orphaned);
  return { ok: true };
}
