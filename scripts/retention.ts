/**
 * Datenschutz-Aufbewahrung (regelmäßig per Cron ausführen, z. B. täglich):
 *  - Kontaktdaten + IP-Hashes abgeschlossener Hinweise/Meldungen/gemeldeter Inhalte nach RETENTION_DAYS löschen
 *  - abgelaufene Sessions und alte Rate-Limit-Einträge entfernen
 * Aufruf: npm run retention
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const days = Number(process.env.RETENTION_DAYS ?? 180);
  const cutoff = new Date(Date.now() - days * 86400_000);

  const hints = await prisma.hint.updateMany({
    where: {
      updatedAt: { lt: cutoff },
      status: { in: ["VERIFIED", "REJECTED", "FORWARDED", "ARCHIVED"] },
      personalDataErasedAt: null,
    },
    data: { contactEnc: null, ipHash: null, personalDataErasedAt: new Date() },
  });
  const submissions = await prisma.caseSubmission.updateMany({
    where: { updatedAt: { lt: cutoff }, status: { in: ["REJECTED", "PUBLISHED"] }, personalDataErasedAt: null },
    data: { contactEnc: null, ipHash: null, personalDataErasedAt: new Date() },
  });
  const reports = await prisma.contentReport.updateMany({
    where: { updatedAt: { lt: cutoff }, status: { in: ["RESOLVED", "DISMISSED"] } },
    data: { contactEnc: null, ipHash: null },
  });
  const sessions = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const buckets = await prisma.rateLimitBucket.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 86400_000) } } });

  await prisma.auditLog.create({
    data: {
      actorLabel: "System (Retention)",
      action: "retention.run",
      entityType: "System",
      summary: `Aufbewahrung (${days} Tage): ${hints.count} Hinweise, ${submissions.count} Meldungen, ${reports.count} gemeldete Inhalte bereinigt; ${sessions.count} Sessions, ${buckets.count} Rate-Limit-Einträge entfernt`,
    },
  });
  console.log(`Retention: hints=${hints.count} submissions=${submissions.count} reports=${reports.count} sessions=${sessions.count} buckets=${buckets.count}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
