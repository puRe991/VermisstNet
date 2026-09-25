import os from "node:os";
import path from "node:path";

// Eigene Test-Datenbank – niemals die Entwicklungs- oder Produktionsdatenbank verwenden.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://vermisst:vermisst@localhost:5432/vermisstatlas_test?schema=public";
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.APP_URL = "http://localhost:3000";
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.IP_HASH_SECRET = "test-ip-hash-secret-0123456789";
process.env.STORAGE_DIR = path.join(os.tmpdir(), "vermisstatlas-test-storage");
process.env.TRUST_PROXY = "true";
