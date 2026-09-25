import { beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as report } from "@/app/api/cases/[id]/reports/route";
import { createCase, ctx, req, resetDb } from "../helpers/fixtures";

beforeEach(async () => {
  await resetDb();
});

describe("Rate Limiting", () => {
  it("begrenzt Login-Versuche pro IP (429 mit Retry-After)", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await login(
        req("/api/auth/login", { method: "POST", ip: "192.0.2.50", body: { email: `x${i}@test.invalid`, password: "falsch" } }),
        ctx({}),
      );
      statuses.push(res.status);
      if (res.status === 429) expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
    // andere IP ist nicht betroffen
    const other = await login(req("/api/auth/login", { method: "POST", ip: "192.0.2.51", body: { email: "y@test.invalid", password: "falsch" } }), ctx({}));
    expect(other.status).toBe(401);
  });

  it("begrenzt öffentliche Formulare", async () => {
    const c = await createCase();
    const send = () =>
      report(
        req(`/api/cases/${c.publicNumber}/reports`, { method: "POST", ip: "192.0.2.60", body: { reason: "OTHER", message: "Bitte prüfen" } }),
        ctx({ id: c.publicNumber }),
      );
    for (let i = 0; i < 10; i++) expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(429);
  });
});
