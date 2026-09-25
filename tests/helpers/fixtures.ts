import { NextRequest } from "next/server";
import type { Role, SourceType } from "@prisma/client";
import { prisma } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import type { Actor } from "@/server/auth/actor";

export const ORIGIN = "http://localhost:3000";

/** Leert alle Tabellen (TRUNCATE umgeht den zeilenbasierten Audit-Trigger – nur in Tests). */
export async function resetDb() {
  await prisma.$executeRaw`TRUNCATE TABLE "audit_logs", "review_events", "rate_limit_buckets", "sessions",
    "media", "hints", "content_reports", "case_submissions", "timeline_events", "locations", "sources",
    "cases", "persons", "users", "counters" CASCADE`;
}

let userCounter = 0;
const passwordHashCache = new Map<string, string>();

export async function createUser(role: Role, opts: { password?: string; displayName?: string } = {}) {
  userCounter++;
  const password = opts.password ?? "Test-Passwort-123";
  let passwordHash = passwordHashCache.get(password);
  if (!passwordHash) {
    passwordHash = await hashPassword(password);
    passwordHashCache.set(password, passwordHash);
  }
  const user = await prisma.user.create({
    data: {
      email: `user${userCounter}-${role.toLowerCase()}@test.invalid`,
      displayName: opts.displayName ?? `${role} ${userCounter}`,
      role,
      passwordHash,
    },
  });
  const { token } = await createSession(user.id, "vitest");
  const actor: Actor = {
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    ipHash: `ip-${userCounter}`,
    userAgent: "vitest",
  };
  return { user, token, actor, cookie: `va_session=${token}` };
}

export const anonymousActor = (ip = "anon"): Actor => ({ user: null, ipHash: ip, userAgent: "vitest" });

let caseCounter = 0;

/** Veröffentlichter Fall mit internen Markern, die niemals öffentlich auftauchen dürfen. */
export async function createCase(opts: {
  createdById?: string;
  published?: boolean;
  status?: "ACTIVE" | "FOUND" | "CLOSED" | "ARCHIVED";
  age?: number | null;
  sourceType?: SourceType;
  sourceVerified?: boolean;
  firstName?: string;
  lastName?: string;
  city?: string;
  privacyLevel?: "FULL_NAME" | "FIRST_NAME_INITIAL" | "ANONYMIZED";
} = {}) {
  caseCounter++;
  const n = caseCounter;
  const published = opts.published ?? true;
  const c = await prisma.case.create({
    data: {
      publicNumber: `VA-2026-${String(900000 + n).padStart(6, "0")}`,
      status: opts.status ?? "ACTIVE",
      publicationStatus: published ? "PUBLISHED" : "DRAFT",
      publishedAt: published ? new Date() : null,
      missingSince: new Date("2026-09-06T14:00:00Z"),
      missingPlace: `${opts.city ?? "Hagen"}, Innenstadt`,
      city: opts.city ?? "Hagen",
      federalState: "DE-NW",
      circumstances: `Öffentliche Umstände ${n}`,
      internalReference: `SECRET-REF-${n}`,
      internalNotes: `SECRET-NOTE-${n}`,
      person: {
        create: {
          firstName: opts.firstName ?? `Testperson${n}`,
          lastName: opts.lastName ?? `Geheimnachname${n}`,
          birthDate: opts.age === undefined ? new Date("2009-03-15") : null,
          ageAtMissing: opts.age === undefined ? null : opts.age,
          gender: "FEMALE",
          privacyLevel: opts.privacyLevel ?? "FIRST_NAME_INITIAL",
        },
      },
      sources: {
        create: {
          sourceType: opts.sourceType ?? "POLICE",
          title: `Polizeimeldung ${n}`,
          organization: "Polizei Test",
          url: "https://example.org/test",
          verifiedAt: opts.sourceVerified === false ? null : new Date(),
          notes: `SECRET-SOURCE-NOTE-${n}`,
        },
      },
      locations: {
        create: [
          {
            type: "MISSING_LOCATION",
            label: "Hagen, Innenstadt",
            latitude: 51.35947,
            longitude: 7.47318,
            precisionM: 500,
            visibility: "PUBLIC",
          },
          {
            type: "POSSIBLE_LOCATION",
            label: `SECRET-LOCATION-${n}`,
            latitude: 51.4,
            longitude: 7.5,
            precisionM: 100,
            visibility: "INTERNAL",
          },
        ],
      },
      timelineEvents: {
        create: [
          { type: "MISSING", occurredAt: new Date("2026-09-06T14:00:00Z"), description: "Öffentlich: vermisst", visibility: "PUBLIC" },
          { type: "NEW_INFORMATION", occurredAt: new Date("2026-09-07T10:00:00Z"), description: `SECRET-TIMELINE-${n}`, visibility: "INTERNAL" },
        ],
      },
      ...(opts.createdById ? { createdBy: { connect: { id: opts.createdById } } } : {}),
    },
    include: { sources: true, person: true },
  });
  await prisma.$executeRaw`SELECT refresh_case_search(${c.id}::uuid)`;
  return c;
}

type ReqInit = { method?: string; body?: unknown; cookie?: string; origin?: string | null; ip?: string; form?: FormData };

export function req(path: string, init: ReqInit = {}): NextRequest {
  const headers = new Headers();
  if (init.origin !== null) headers.set("origin", init.origin ?? ORIGIN);
  if (init.cookie) headers.set("cookie", init.cookie);
  headers.set("x-real-ip", init.ip ?? "203.0.113.10");
  let body: BodyInit | undefined;
  if (init.form) {
    body = init.form;
  } else if (init.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.body);
  }
  return new NextRequest(new URL(path, ORIGIN), { method: init.method ?? "GET", headers, body });
}

export const ctx = <P extends Record<string, string>>(params: P) => ({ params: Promise.resolve(params) });

export async function readJson(res: Response): Promise<{ status: number; body: unknown; text: string }> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, text };
}
