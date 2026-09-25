import "server-only";
import sharp from "sharp";
import { AppError } from "./errors";
import { randomToken, sha256Hex } from "./security/crypto";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_PIXELS = 40_000_000; // Schutz vor Decompression Bombs
const MAX_DIMENSION = 2000;
const THUMB_DIMENSION = 480;

export type DetectedType = "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/webm";

/** Erkennung anhand der Magic Bytes – Dateiendung und Client-MIME werden ignoriert. */
export function detectFileType(buf: Buffer): DetectedType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (/^(isom|iso2|mp41|mp42|avc1|M4V |dash)$/.test(brand)) return "video/mp4";
  }
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "video/webm";
  return null;
}

export type ProcessedUpload = {
  kind: "image" | "video";
  data: Buffer;
  thumb: Buffer | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  sha256: string;
  storageKey: string;
};

function newKey(prefix: string, ext: string): string {
  const d = new Date();
  const month = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${prefix}/${month}/${randomToken(18).toLowerCase().replace(/[^a-z0-9]/g, "x")}.${ext}`;
}

/**
 * Prüft und verarbeitet eine hochgeladene Datei.
 * Bilder werden vollständig dekodiert und als WebP NEU kodiert → EXIF/GPS und eingebettete
 * Nutzdaten werden verworfen. Videos sind nur als interne Anhänge erlaubt (keine Veröffentlichung).
 */
export async function processUpload(
  file: File,
  opts: { allowVideo: boolean; keyPrefix: "cases" | "hints" | "submissions" },
): Promise<ProcessedUpload> {
  if (file.size === 0) throw new AppError("VALIDATION_ERROR", "Leere Datei");
  const limit = opts.allowVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) throw new AppError("PAYLOAD_TOO_LARGE", `Datei zu groß (max. ${Math.round(limit / 1024 / 1024)} MB)`);

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > limit) throw new AppError("PAYLOAD_TOO_LARGE", "Datei zu groß");
  const type = detectFileType(buf);
  if (!type) throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Nur JPG, PNG oder WebP erlaubt" + (opts.allowVideo ? " (bzw. MP4/WebM)" : ""));

  if (type.startsWith("video/")) {
    if (!opts.allowVideo) throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Videos sind hier nicht erlaubt");
    const ext = type === "video/mp4" ? "mp4" : "webm";
    return {
      kind: "video",
      data: buf,
      thumb: null,
      mimeType: type,
      width: null,
      height: null,
      sha256: sha256Hex(buf),
      storageKey: newKey(opts.keyPrefix, ext),
    };
  }

  if (buf.length > MAX_IMAGE_BYTES) throw new AppError("PAYLOAD_TOO_LARGE", "Bild zu groß (max. 8 MB)");

  try {
    const input = sharp(buf, { limitInputPixels: MAX_PIXELS, failOn: "error", animated: false });
    const meta = await input.metadata();
    const expectedFormat = ({ "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[type];
    if (meta.format !== expectedFormat) throw new Error("Format stimmt nicht mit Inhalt überein");

    const { data, info } = await sharp(buf, { limitInputPixels: MAX_PIXELS, failOn: "error" })
      .rotate() // EXIF-Orientierung anwenden, bevor Metadaten verworfen werden
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true }); // sharp übernimmt standardmäßig KEINE Metadaten

    const thumb = await sharp(data)
      .resize({ width: THUMB_DIMENSION, height: THUMB_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    return {
      kind: "image",
      data,
      thumb,
      mimeType: "image/webp",
      width: info.width,
      height: info.height,
      sha256: sha256Hex(data),
      storageKey: newKey(opts.keyPrefix, "webp"),
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Die Bilddatei ist beschädigt oder ungültig");
  }
}
