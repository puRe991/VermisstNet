import "server-only";
import type { Prisma, Role } from "@prisma/client";
import type { z } from "zod";
import { ROLE_LABELS } from "@/lib/labels";
import type { auditListSchema, userCreateSchema, userUpdateSchema } from "@/lib/validation/admin";
import { actorLabel, requireStaff, type Actor } from "../auth/actor";
import { hashPassword } from "../auth/password";
import { invalidateUserSessions } from "../auth/session";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { conflict, notFound } from "../errors";

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function listUsers(actor: Actor) {
  requireStaff(actor, "user.manage");
  return prisma.user.findMany({ select: userSelect, orderBy: [{ role: "desc" }, { displayName: "asc" }] });
}

export async function createUser(actor: Actor, input: z.infer<typeof userCreateSchema>) {
  requireStaff(actor, "user.manage");
  const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) throw conflict("E-Mail-Adresse bereits vergeben");
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { email: input.email, displayName: input.displayName, role: input.role, passwordHash },
      select: userSelect,
    });
    await writeAudit(tx, actor, {
      action: "user.create",
      entityType: "User",
      entityId: u.id,
      summary: `${actorLabel(actor)} legte Benutzer ${u.displayName} mit Rolle ${ROLE_LABELS[u.role]} an`,
      newData: { email: u.email, displayName: u.displayName, role: u.role },
    });
    return u;
  });
}

/** Der letzte aktive Administrator kann weder herabgestuft noch deaktiviert werden. */
async function assertNotLastAdmin(tx: Prisma.TransactionClient, userId: string) {
  const admins = await tx.user.count({ where: { role: "ADMINISTRATOR", isActive: true, id: { not: userId } } });
  if (admins === 0) throw conflict("Der letzte aktive Administrator kann nicht herabgestuft oder deaktiviert werden");
}

export async function updateUser(actor: Actor, id: string, input: z.infer<typeof userUpdateSchema>) {
  requireStaff(actor, "user.manage");
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.user.findUnique({ where: { id }, select: userSelect });
    if (!before) throw notFound("Benutzer");
    const demotes = input.role !== undefined && input.role !== "ADMINISTRATOR" && before.role === "ADMINISTRATOR";
    const deactivates = input.isActive === false && before.isActive && before.role === "ADMINISTRATOR";
    if (demotes || deactivates) await assertNotLastAdmin(tx, id);

    const after = await tx.user.update({ where: { id }, data: input, select: userSelect });
    const changes: string[] = [];
    if (input.role !== undefined && input.role !== before.role) {
      changes.push(`Rolle von ${ROLE_LABELS[before.role]} auf ${ROLE_LABELS[input.role as Role]}`);
    }
    if (input.isActive !== undefined && input.isActive !== before.isActive) {
      changes.push(input.isActive ? "aktiviert" : "deaktiviert");
    }
    if (input.displayName !== undefined && input.displayName !== before.displayName) changes.push("Anzeigename");
    if (changes.length) {
      await writeAudit(tx, actor, {
        action: "user.update",
        entityType: "User",
        entityId: id,
        summary: `${actorLabel(actor)} änderte Benutzer ${before.displayName}: ${changes.join(", ")}`,
        oldData: { role: before.role, isActive: before.isActive, displayName: before.displayName },
        newData: { role: after.role, isActive: after.isActive, displayName: after.displayName },
      });
    }
    return { after, securityRelevant: after.role !== before.role || after.isActive !== before.isActive };
  });
  // Rechteänderung wirkt sofort: bestehende Sessions beenden
  if (result.securityRelevant) await invalidateUserSessions(id);
  return result.after;
}

export async function listAudit(actor: Actor, q: z.infer<typeof auditListSchema>) {
  requireStaff(actor, "audit.read");
  const where: Prisma.AuditLogWhereInput = {
    ...(q.entityType ? { entityType: q.entityType } : {}),
    ...(q.entityId ? { entityId: q.entityId } : {}),
    ...(q.actor ? { actorId: q.actor } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      omit: { ipHash: true },
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}
