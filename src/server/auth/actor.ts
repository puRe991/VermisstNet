import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Role } from "@prisma/client";
import { can, type Permission } from "@/lib/permissions";
import { forbidden, unauthenticated } from "../errors";
import { env } from "../env";
import { hashIp } from "../security/crypto";
import { sessionCookieName, validateSessionToken, type SessionUser } from "./session";

/** Handelnde Instanz einer Anfrage. user = null → nicht angemeldeter Besucher. */
export type Actor = {
  user: SessionUser | null;
  ipHash: string | null;
  userAgent: string | null;
};

export const ANONYMOUS: Actor = { user: null, ipHash: null, userAgent: null };

export function actorRole(actor: Actor): Role | null {
  return actor.user?.role ?? null;
}

export function actorLabel(actor: Actor): string {
  if (!actor.user) return "System";
  const roleLabel: Record<Role, string> = {
    VISITOR: "Besucher",
    REPORTER: "Melder",
    MODERATOR: "Moderator",
    EDITOR: "Redakteur",
    ADMINISTRATOR: "Administrator",
  };
  return `${roleLabel[actor.user.role]} ${actor.user.displayName}`;
}

/**
 * Client-IP für Rate Limiting / Missbrauchserkennung (wird nur als HMAC gespeichert).
 * - TRUST_PROXY=true: `X-Real-IP` bzw. der vom vertrauenswürdigen Proxy rechts angehängte XFF-Eintrag.
 * - sonst: Next.js setzt `X-Forwarded-For` aus der Socket-Adresse, sofern der Client keinen eigenen
 *   Header mitsendet. Ein gefälschter Header verschiebt nur den eigenen Rate-Limit-Bucket (kein
 *   Aussperren anderer Nutzer); Login ist zusätzlich pro Konto begrenzt. Produktion: hinter Proxy betreiben.
 */
export function clientIpFromHeaders(h: Headers): string | null {
  if (env().TRUST_PROXY) {
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  }
  const xff = h.get("x-forwarded-for");
  if (!xff) return null;
  const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1]?.slice(0, 64) ?? null;
}

function readCookie(h: Headers, name: string): string | null {
  const raw = h.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

/** Für Route Handler: Actor aus dem Request. */
export async function getActorFromRequest(req: Request): Promise<Actor> {
  const token = readCookie(req.headers, sessionCookieName());
  const user = await validateSessionToken(token);
  return {
    user,
    ipHash: hashIp(clientIpFromHeaders(req.headers)),
    userAgent: req.headers.get("user-agent"),
  };
}

/** Für Server Components: Actor aus next/headers (pro Request gecacht). */
export const getActor = cache(async (): Promise<Actor> => {
  const [c, h] = await Promise.all([cookies(), headers()]);
  const user = await validateSessionToken(c.get(sessionCookieName())?.value);
  return { user, ipHash: hashIp(clientIpFromHeaders(h)), userAgent: h.get("user-agent") };
});

export function requireUser(actor: Actor): SessionUser {
  if (!actor.user) throw unauthenticated();
  return actor.user;
}

/** Zentrale Berechtigungsprüfung im Service-Layer. */
export function requirePermission(actor: Actor, permission: Permission): SessionUser | null {
  if (can(actorRole(actor), permission)) return actor.user;
  if (!actor.user) throw unauthenticated();
  throw forbidden();
}

export function requireStaff(actor: Actor, permission: Permission): SessionUser {
  const user = requireUser(actor);
  if (!can(user.role, permission)) throw forbidden();
  return user;
}
