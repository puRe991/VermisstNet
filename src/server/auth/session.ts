import "server-only";
import type { Role } from "@prisma/client";
import { prisma } from "../db";
import { env } from "../env";
import { randomToken, sha256Hex } from "../security/crypto";

export type SessionUser = { id: string; email: string; displayName: string; role: Role };

/** In Produktion mit __Host-Präfix: erzwingt Secure, Path=/ und verbietet Domain. */
export function sessionCookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-va_session" : "va_session";
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

const REFRESH_AFTER_MS = 60 * 60 * 1000; // Sliding-Refresh höchstens stündlich

export async function createSession(userId: string, userAgent: string | null): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + env().SESSION_TTL_HOURS * 3600 * 1000);
  await prisma.session.create({
    data: {
      tokenHash: sha256Hex(token),
      userId,
      expiresAt,
      userAgent: userAgent?.slice(0, 255) ?? null,
    },
  });
  return { token, expiresAt };
}

/**
 * Prüft ein Session-Token. Rolle und Aktiv-Status werden bei jeder Anfrage frisch aus der DB
 * gelesen, damit Rechteentzug sofort wirkt.
 */
export async function validateSessionToken(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token || token.length > 200) return null;
  const tokenHash = sha256Hex(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, displayName: true, role: true, isActive: true } } },
  });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now || !session.user.isActive) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (now - session.lastSeenAt.getTime() > REFRESH_AFTER_MS) {
    await prisma.session
      .update({
        where: { id: session.id },
        data: { lastSeenAt: new Date(now), expiresAt: new Date(now + env().SESSION_TTL_HOURS * 3600 * 1000) },
      })
      .catch(() => undefined);
  }
  const { id, email, displayName, role } = session.user;
  return { id, email, displayName, role };
}

export async function invalidateSessionToken(token: string | null | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: sha256Hex(token) } });
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
