import "server-only";
import { prisma } from "../db";
import { AppError } from "../errors";

export type RateLimitRule = { bucket: string; limit: number; windowSeconds: number };

export const RATE_LIMITS = {
  login: { bucket: "login", limit: 10, windowSeconds: 15 * 60 },
  register: { bucket: "register", limit: 5, windowSeconds: 60 * 60 },
  hint: { bucket: "hint", limit: 10, windowSeconds: 60 * 60 },
  submission: { bucket: "submission", limit: 5, windowSeconds: 60 * 60 },
  report: { bucket: "report", limit: 10, windowSeconds: 60 * 60 },
  upload: { bucket: "upload", limit: 60, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Fixed-Window-Rate-Limit in PostgreSQL (funktioniert über mehrere Instanzen hinweg).
 * Atomar per INSERT … ON CONFLICT; wirft AppError RATE_LIMITED.
 */
export async function enforceRateLimit(rule: RateLimitRule, subject: string | null): Promise<void> {
  const key = `${rule.bucket}:${subject ?? "unknown"}`;
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (rule.windowSeconds * 1000)) * rule.windowSeconds * 1000);

  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limit_buckets" ("key", "window_start", "count")
    VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limit_buckets"."window_start" = EXCLUDED."window_start"
                     THEN "rate_limit_buckets"."count" + 1 ELSE 1 END,
      "window_start" = EXCLUDED."window_start"
    RETURNING "count"`;

  const count = rows[0]?.count ?? 1;
  if (count > rule.limit) {
    const retryAfter = Math.ceil((windowStart.getTime() + rule.windowSeconds * 1000 - now.getTime()) / 1000);
    throw new AppError("RATE_LIMITED", "Zu viele Anfragen. Bitte versuchen Sie es später erneut.", { retryAfter });
  }
}
