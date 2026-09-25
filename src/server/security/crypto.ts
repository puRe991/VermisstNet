import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { env } from "../env";

const KEY_ID = "k1"; // Präfix ermöglicht spätere Schlüsselrotation

function key(): Buffer {
  return Buffer.from(env().DATA_ENCRYPTION_KEY, "base64");
}

/** AES-256-GCM. Format: "k1:<iv b64>:<tag b64>:<ciphertext b64>" */
export function encryptField(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [KEY_ID, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decryptField(enc: string | null | undefined): string | null {
  if (!enc) return null;
  const [kid, ivB64, tagB64, ctB64] = enc.split(":");
  if (kid !== KEY_ID || !ivB64 || !tagB64 || ctB64 === undefined) throw new Error("Unbekanntes Chiffrat-Format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
}

/** IP-Adressen werden nie im Klartext gespeichert. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHmac("sha256", env().IP_HASH_SECRET).update(ip).digest("hex").slice(0, 32);
}

export function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Gut lesbarer Referenzcode ohne verwechselbare Zeichen, z. B. "H-7KQ2-M9XP" */
export function referenceCode(prefix: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i]! % alphabet.length];
  return `${prefix}-${out.slice(0, 4)}-${out.slice(4)}`;
}
