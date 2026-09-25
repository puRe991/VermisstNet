import "server-only";
import { AppError } from "../errors";
import { storage, thumbKey } from "../storage";
import { processUpload, type ProcessedUpload } from "../upload";

/**
 * Verarbeitet und speichert Dateien. Gibt eine Aufräumfunktion zurück, die bei einem
 * späteren Fehler (z. B. Transaktionsabbruch) die bereits gespeicherten Dateien löscht.
 */
export async function storeUploads(
  files: File[],
  opts: { allowVideo: boolean; keyPrefix: "cases" | "hints" | "submissions"; maxFiles: number },
): Promise<{ uploads: ProcessedUpload[]; cleanup: () => Promise<void> }> {
  if (files.length > opts.maxFiles) {
    throw new AppError("VALIDATION_ERROR", `Maximal ${opts.maxFiles} Dateien erlaubt`);
  }
  const uploads: ProcessedUpload[] = [];
  const stored: string[] = [];
  const cleanup = async () => {
    await Promise.all(stored.map((k) => storage().delete(k).catch(() => undefined)));
  };
  try {
    for (const file of files) {
      const up = await processUpload(file, opts);
      await storage().put(up.storageKey, up.data);
      stored.push(up.storageKey);
      if (up.thumb) {
        await storage().put(thumbKey(up.storageKey), up.thumb);
        stored.push(thumbKey(up.storageKey));
      }
      uploads.push(up);
    }
  } catch (err) {
    await cleanup();
    throw err;
  }
  return { uploads, cleanup };
}

/** Nur echte, nicht-leere Dateien aus FormData übernehmen. */
export function filesFromForm(form: FormData, field: string): File[] {
  return form.getAll(field).filter((v): v is File => typeof v !== "string" && v.size > 0);
}
