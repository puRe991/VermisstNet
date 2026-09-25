import "server-only";
import { requireStaff, type Actor } from "../auth/actor";
import { prisma } from "../db";

/** Moderationsdashboard: offene Arbeit auf einen Blick. */
export async function getDashboard(actor: Actor) {
  requireStaff(actor, "admin.access");
  const [
    newHintsCount,
    openHintsCount,
    newSubmissionsCount,
    openSubmissionsCount,
    unverifiedSourcesCount,
    openReportsCount,
    pendingMediaCount,
    draftCasesCount,
    newHints,
    newSubmissions,
    unverifiedSources,
    openReports,
    recentCases,
  ] = await Promise.all([
    prisma.hint.count({ where: { status: "NEW" } }),
    prisma.hint.count({ where: { status: { in: ["UNDER_REVIEW", "REQUIRES_INFORMATION"] } } }),
    prisma.caseSubmission.count({ where: { status: "SUBMITTED" } }),
    prisma.caseSubmission.count({ where: { status: { in: ["REVIEW", "SOURCE_VERIFICATION"] } } }),
    prisma.source.count({ where: { verifiedAt: null } }),
    prisma.contentReport.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.media.count({ where: { caseId: { not: null }, reviewStatus: "PENDING" } }),
    prisma.case.count({ where: { publicationStatus: "DRAFT", status: { not: "ARCHIVED" } } }),
    prisma.hint.findMany({
      where: { status: "NEW" },
      select: { id: true, referenceCode: true, hintType: true, createdAt: true, case: { select: { publicNumber: true } } },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    prisma.caseSubmission.findMany({
      where: { status: { in: ["SUBMITTED", "REVIEW", "SOURCE_VERIFICATION"] } },
      select: { id: true, referenceCode: true, personName: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    prisma.source.findMany({
      where: { verifiedAt: null },
      select: { id: true, title: true, sourceType: true, createdAt: true, case: { select: { id: true, publicNumber: true } } },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    prisma.contentReport.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      select: { id: true, reason: true, status: true, createdAt: true, case: { select: { id: true, publicNumber: true } } },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    prisma.case.findMany({
      select: {
        id: true,
        publicNumber: true,
        status: true,
        publicationStatus: true,
        updatedAt: true,
        person: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  const tasks = [
    { key: "hints", label: "Neue Hinweise sichten", count: newHintsCount, href: "/admin/hinweise?status=NEW" },
    { key: "hints-open", label: "Hinweise in Prüfung / mit Rückfrage", count: openHintsCount, href: "/admin/hinweise?status=UNDER_REVIEW" },
    { key: "submissions", label: "Neue Fallmeldungen prüfen", count: newSubmissionsCount, href: "/admin/meldungen?status=SUBMITTED" },
    { key: "submissions-open", label: "Fallmeldungen im Prüfprozess", count: openSubmissionsCount, href: "/admin/meldungen" },
    { key: "sources", label: "Quellen verifizieren", count: unverifiedSourcesCount, href: "/admin/quellen" },
    { key: "reports", label: "Gemeldete Inhalte bearbeiten", count: openReportsCount, href: "/admin/inhalte" },
    { key: "media", label: "Bilder freigeben", count: pendingMediaCount, href: "/admin/faelle" },
    { key: "drafts", label: "Fallentwürfe fertigstellen", count: draftCasesCount, href: "/admin/faelle?publication=DRAFT" },
  ].filter((t) => t.count > 0);

  return {
    counts: {
      newHints: newHintsCount,
      openHints: openHintsCount,
      newSubmissions: newSubmissionsCount,
      openSubmissions: openSubmissionsCount,
      unverifiedSources: unverifiedSourcesCount,
      openReports: openReportsCount,
      pendingMedia: pendingMediaCount,
      draftCases: draftCasesCount,
    },
    tasks,
    newHints,
    newSubmissions,
    unverifiedSources,
    openReports,
    recentCases,
  };
}
