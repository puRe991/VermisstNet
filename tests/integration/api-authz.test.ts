import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import * as dashboard from "@/app/api/admin/dashboard/route";
import * as hints from "@/app/api/admin/hints/route";
import * as hint from "@/app/api/admin/hints/[id]/route";
import * as hintErase from "@/app/api/admin/hints/[id]/erase/route";
import * as submissions from "@/app/api/admin/submissions/route";
import * as cases from "@/app/api/admin/cases/route";
import * as adminCase from "@/app/api/admin/cases/[id]/route";
import * as publish from "@/app/api/admin/cases/[id]/publish/route";
import * as caseSources from "@/app/api/admin/cases/[id]/sources/route";
import * as caseLocations from "@/app/api/admin/cases/[id]/locations/route";
import * as users from "@/app/api/admin/users/route";
import * as user from "@/app/api/admin/users/[id]/route";
import * as audit from "@/app/api/admin/audit/route";
import * as reports from "@/app/api/admin/reports/route";
import * as media from "@/app/api/media/route";
import * as meHints from "@/app/api/me/hints/route";
import { createCase, createUser, ctx, readJson, req, resetDb } from "../helpers/fixtures";

type U = Awaited<ReturnType<typeof createUser>>;
let reporter: U, moderator: U, editor: U, admin: U;
let caseId: string;
let hintId: string;

beforeAll(async () => {
  await resetDb();
  [reporter, moderator, editor, admin] = await Promise.all([
    createUser("REPORTER"),
    createUser("MODERATOR", { displayName: "Florian" }),
    createUser("EDITOR"),
    createUser("ADMINISTRATOR"),
  ]);
  const c = await createCase({ published: false });
  caseId = c.id;
  const h = await prisma.hint.create({
    data: { referenceCode: "H-AUTH-0001", caseId, hintType: "OTHER", description: "SECRET-HINT", originalPayload: {}, reporterId: moderator.user.id },
  });
  hintId = h.id;
});

const endpoints = () => [
  { name: "GET dashboard", min: "MODERATOR", call: (cookie?: string) => dashboard.GET(req("/api/admin/dashboard", { cookie }), ctx({})) },
  { name: "GET hints", min: "MODERATOR", call: (cookie?: string) => hints.GET(req("/api/admin/hints", { cookie }), ctx({})) },
  { name: "GET hint/:id", min: "MODERATOR", call: (cookie?: string) => hint.GET(req(`/api/admin/hints/${hintId}`, { cookie }), ctx({ id: hintId })) },
  { name: "GET submissions", min: "MODERATOR", call: (cookie?: string) => submissions.GET(req("/api/admin/submissions", { cookie }), ctx({})) },
  { name: "GET cases", min: "MODERATOR", call: (cookie?: string) => cases.GET(req("/api/admin/cases", { cookie }), ctx({})) },
  { name: "GET case/:id", min: "MODERATOR", call: (cookie?: string) => adminCase.GET(req(`/api/admin/cases/${caseId}`, { cookie }), ctx({ id: caseId })) },
  { name: "GET reports", min: "MODERATOR", call: (cookie?: string) => reports.GET(req("/api/admin/reports", { cookie }), ctx({})) },
  {
    name: "POST case",
    min: "EDITOR",
    call: (cookie?: string) =>
      cases.POST(
        req("/api/admin/cases", {
          method: "POST",
          cookie,
          body: { person: { firstName: "Neu", gender: "UNKNOWN", privacyLevel: "ANONYMIZED" }, missingSince: "2026-09-01", missingPlace: "Hagen" },
        }),
        ctx({}),
      ),
  },
  {
    name: "PATCH case (URGENT)",
    min: "EDITOR",
    call: (cookie?: string) => adminCase.PATCH(req(`/api/admin/cases/${caseId}`, { method: "PATCH", cookie, body: { isUrgent: true } }), ctx({ id: caseId })),
  },
  { name: "POST publish", min: "EDITOR", call: (cookie?: string) => publish.POST(req(`/api/admin/cases/${caseId}/publish`, { method: "POST", cookie }), ctx({ id: caseId })) },
  {
    name: "POST location",
    min: "EDITOR",
    call: (cookie?: string) =>
      caseLocations.POST(
        req(`/api/admin/cases/${caseId}/locations`, { method: "POST", cookie, body: { type: "SIGHTING", label: "Hagen", latitude: 51.3, longitude: 7.4 } }),
        ctx({ id: caseId }),
      ),
  },
  {
    name: "POST source",
    min: "MODERATOR",
    call: (cookie?: string) =>
      caseSources.POST(req(`/api/admin/cases/${caseId}/sources`, { method: "POST", cookie, body: { sourceType: "MEDIA", title: "Artikel" } }), ctx({ id: caseId })),
  },
  { name: "POST media", min: "EDITOR", call: (cookie?: string) => media.POST(req("/api/media", { method: "POST", cookie, body: { caseId } }), ctx({})) },
  { name: "GET users", min: "ADMINISTRATOR", call: (cookie?: string) => users.GET(req("/api/admin/users", { cookie }), ctx({})) },
  {
    name: "PATCH user (Rolle)",
    min: "ADMINISTRATOR",
    call: (cookie?: string) =>
      user.PATCH(req(`/api/admin/users/${reporter.user.id}`, { method: "PATCH", cookie, body: { role: "ADMINISTRATOR" } }), ctx({ id: reporter.user.id })),
  },
  { name: "GET audit", min: "ADMINISTRATOR", call: (cookie?: string) => audit.GET(req("/api/admin/audit", { cookie }), ctx({})) },
  { name: "POST hint erase", min: "ADMINISTRATOR", call: (cookie?: string) => hintErase.POST(req(`/api/admin/hints/${hintId}/erase`, { method: "POST", cookie }), ctx({ id: hintId })) },
];

const RANK = { VISITOR: 0, REPORTER: 1, MODERATOR: 2, EDITOR: 3, ADMINISTRATOR: 4 } as const;

describe("Unautorisierte Admin-Aufrufe", () => {
  it("ohne Anmeldung → 401 auf allen internen Endpunkten", async () => {
    for (const e of endpoints()) {
      const res = await e.call(undefined);
      expect(res.status, e.name).toBe(401);
    }
  });

  it("mit ungültigem/gefälschtem Session-Cookie → 401", async () => {
    for (const e of endpoints().slice(0, 3)) {
      expect((await e.call("va_session=forged-token")).status, e.name).toBe(401);
    }
  });

  it("zu niedrige Rolle → 403 (und keine internen Daten in der Antwort)", async () => {
    const byRole = { REPORTER: reporter, MODERATOR: moderator, EDITOR: editor } as const;
    for (const [role, u] of Object.entries(byRole) as [keyof typeof byRole, U][]) {
      for (const e of endpoints()) {
        if (RANK[role] >= RANK[e.min as keyof typeof RANK]) continue;
        const { status, text } = await readJson(await e.call(u.cookie));
        expect(status, `${role} → ${e.name}`).toBe(403);
        expect(text).not.toContain("SECRET");
      }
    }
  });

  it("ausreichende Rolle → kein 401/403", async () => {
    for (const e of endpoints()) {
      if (e.name === "POST hint erase" || e.name === "PATCH user (Rolle)") continue; // destruktiv, separat getestet
      const u = { MODERATOR: moderator, EDITOR: editor, ADMINISTRATOR: admin }[e.min as "MODERATOR" | "EDITOR" | "ADMINISTRATOR"];
      const res = await e.call(u.cookie);
      expect([401, 403], `${e.name} → ${res.status}`).not.toContain(res.status);
    }
  });
});

describe("IDOR & Konto-Isolation", () => {
  it("Reporter sehen nur eigene Hinweise", async () => {
    const { body } = await readJson(await meHints.GET(req("/api/me/hints", { cookie: reporter.cookie }), ctx({})));
    expect((body as { items: unknown[] }).items).toEqual([]);
  });

  it("nicht existierende oder ungültige IDs → 404 statt Fehler", async () => {
    const r1 = await hint.GET(req("/api/admin/hints/00000000-0000-0000-0000-000000000000", { cookie: moderator.cookie }), ctx({ id: "00000000-0000-0000-0000-000000000000" }));
    expect(r1.status).toBe(404);
    const r2 = await hint.GET(req("/api/admin/hints/abc' OR 1=1", { cookie: moderator.cookie }), ctx({ id: "abc' OR 1=1" }));
    expect(r2.status).toBe(404);
  });

  it("Quellen-/Ortsreferenzen eines fremden Falls werden abgelehnt", async () => {
    const other = await createCase({ published: false });
    const res = await caseLocations.POST(
      req(`/api/admin/cases/${caseId}/locations`, {
        method: "POST",
        cookie: editor.cookie,
        body: { type: "SIGHTING", label: "Hagen", latitude: 51.3, longitude: 7.4, sourceId: other.sources[0]!.id },
      }),
      ctx({ id: caseId }),
    );
    expect(res.status).toBe(400);
  });
});

describe("Rechteverwaltung", () => {
  it("Rollenänderung beendet bestehende Sessions sofort", async () => {
    const victim = await createUser("MODERATOR");
    expect((await dashboard.GET(req("/api/admin/dashboard", { cookie: victim.cookie }), ctx({}))).status).toBe(200);
    const res = await user.PATCH(
      req(`/api/admin/users/${victim.user.id}`, { method: "PATCH", cookie: admin.cookie, body: { role: "REPORTER" } }),
      ctx({ id: victim.user.id }),
    );
    expect(res.status).toBe(200);
    expect((await dashboard.GET(req("/api/admin/dashboard", { cookie: victim.cookie }), ctx({}))).status).toBe(401);
  });

  it("letzter Administrator kann nicht herabgestuft werden", async () => {
    const res = await user.PATCH(
      req(`/api/admin/users/${admin.user.id}`, { method: "PATCH", cookie: admin.cookie, body: { role: "EDITOR" } }),
      ctx({ id: admin.user.id }),
    );
    expect(res.status).toBe(409);
  });

  it("Selbstregistrierung kann keine Rolle setzen", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(
      req("/api/auth/register", { method: "POST", ip: "198.51.100.77", body: { email: "neu@test.invalid", displayName: "Neu", password: "sehr-sicheres-passwort", role: "ADMINISTRATOR" } }),
      ctx({}),
    );
    expect(res.status).toBe(201);
    const u = await prisma.user.findUniqueOrThrow({ where: { email: "neu@test.invalid" } });
    expect(u.role).toBe("REPORTER");
  });

  it("deaktivierte Benutzer können sich nicht anmelden", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const u = await createUser("EDITOR", { password: "Passwort-fuer-Test-1" });
    await prisma.user.update({ where: { id: u.user.id }, data: { isActive: false } });
    const res = await POST(req("/api/auth/login", { method: "POST", ip: "198.51.100.78", body: { email: u.user.email, password: "Passwort-fuer-Test-1" } }), ctx({}));
    expect(res.status).toBe(401);
    expect((await dashboard.GET(req("/api/admin/dashboard", { cookie: u.cookie }), ctx({}))).status).toBe(401);
  });
});
