import "server-only";
import type { z } from "zod";
import type { loginSchema, registerSchema } from "@/lib/validation/public";
import { requirePermission, type Actor } from "../auth/actor";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../auth/password";
import { createSession } from "../auth/session";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { AppError, conflict } from "../errors";
import { RATE_LIMITS, enforceRateLimit } from "../security/rate-limit";

const INVALID_LOGIN = "E-Mail oder Passwort falsch";

export async function login(
  actor: Actor,
  input: z.infer<typeof loginSchema>,
): Promise<{ token: string; expiresAt: Date; user: { id: string; displayName: string; role: string } }> {
  await enforceRateLimit(RATE_LIMITS.login, actor.ipHash ?? `email:${input.email}`);
  // Zusätzlich pro Konto begrenzen (Schutz gegen verteiltes Passwortraten)
  await enforceRateLimit({ ...RATE_LIMITS.login, bucket: "login-account", limit: 20 }, input.email);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    await burnPasswordCheck(input.password);
    throw new AppError("UNAUTHENTICATED", INVALID_LOGIN);
  }
  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok || !user.isActive) throw new AppError("UNAUTHENTICATED", INVALID_LOGIN);

  const session = await createSession(user.id, actor.userAgent);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { ...session, user: { id: user.id, displayName: user.displayName, role: user.role } };
}

export async function register(
  actor: Actor,
  input: z.infer<typeof registerSchema>,
): Promise<{ token: string; expiresAt: Date }> {
  await enforceRateLimit(RATE_LIMITS.register, actor.ipHash);
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw conflict("Für diese E-Mail-Adresse besteht bereits ein Konto");
  const user = await prisma.user.create({
    data: {
      email: input.email,
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password),
      role: "REPORTER", // Selbstregistrierung erhält nie erhöhte Rechte
    },
  });
  await writeAudit(prisma, { ...actor, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } }, {
    action: "user.register",
    entityType: "User",
    entityId: user.id,
    summary: `Neues Konto registriert (${user.displayName})`,
  });
  return createSession(user.id, actor.userAgent);
}

/** Eigene Meldungen und Hinweise (nur Status/Referenz, keine internen Moderationsnotizen). */
export async function getOwnActivity(actor: Actor) {
  const user = requirePermission(actor, "account.own.read")!;
  const [submissions, hints] = await Promise.all([
    prisma.caseSubmission.findMany({
      where: { reporterId: user.id },
      select: { referenceCode: true, personName: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.hint.findMany({
      where: { reporterId: user.id },
      select: {
        referenceCode: true,
        hintType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        case: { select: { publicNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return {
    submissions,
    hints: hints.map((h) => ({ ...h, case: undefined, publicNumber: h.case.publicNumber })),
  };
}
