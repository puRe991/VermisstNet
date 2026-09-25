import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATA_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "DATA_ENCRYPTION_KEY muss 32 Byte (base64) sein"),
  IP_HASH_SECRET: z.string().min(16, "IP_HASH_SECRET zu kurz"),
  STORAGE_DIR: z.string().default("./storage"),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(12),
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  RETENTION_DAYS: z.coerce.number().int().min(7).max(3650).default(180),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Liest und validiert die Umgebung beim ersten Zugriff (fail fast mit klarer Meldung). */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Ungültige Konfiguration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
