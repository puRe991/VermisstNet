import "server-only";
import type { Prisma } from "@prisma/client";
import type { HintInput, ReportInput, SubmissionInput } from "@/lib/validation/public";
import type { Actor } from "../auth/actor";
import { prisma } from "../db";
import { encryptField, referenceCode } from "../security/crypto";
import { RATE_LIMITS, enforceRateLimit } from "../security/rate-limit";
import { findPublicCaseId } from "./public-cases";
import { storeUploads } from "./uploads";

// Öffentliche Eingänge: Hinweise, Vermisstenmeldungen, gemeldete Inhalte.
// Nichts davon wird automatisch veröffentlicht.

function rateSubject(actor: Actor): string | null {
  return actor.ipHash ?? (actor.user ? `u:${actor.user.id}` : null);
}

/** Originaleingabe ohne Kontaktdaten und technische Felder (für die Moderationsansicht). */
function originalPayload(input: Record<string, unknown>): Prisma.InputJsonValue {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === "contact" || k === "consent" || k === "website") continue;
    out[k] = v instanceof Date ? v.toISOString() : (v ?? null);
  }
  return out as Prisma.InputJsonValue;
}

export async function submitHint(
  actor: Actor,
  publicNumber: string,
  input: HintInput,
  files: File[],
): Promise<{ referenceCode: string; status: "NEW" }> {
  await enforceRateLimit(RATE_LIMITS.hint, rateSubject(actor));
  const caseId = await findPublicCaseId(publicNumber, { activeOnly: true });
  const { uploads, cleanup } = await storeUploads(files, { allowVideo: true, keyPrefix: "hints", maxFiles: 3 });

  try {
    const code = referenceCode("H");
    await prisma.hint.create({
      data: {
        referenceCode: code,
        caseId,
        hintType: input.hintType,
        observedDate: input.observedDate ?? null,
        observedTime: input.observedTime ?? null,
        locationText: input.locationText ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        description: input.description,
        isAnonymous: input.isAnonymous,
        contactEnc: encryptField(input.contact),
        // Anonyme Hinweise werden bewusst NICHT mit einem Konto verknüpft
        reporterId: input.isAnonymous ? null : (actor.user?.id ?? null),
        originalPayload: originalPayload(input),
        ipHash: actor.ipHash,
        attachments: {
          create: uploads.map((u) => ({
            storageKey: u.storageKey,
            mimeType: u.mimeType,
            sizeBytes: u.data.length,
            width: u.width,
            height: u.height,
            sha256: u.sha256,
            hasThumbnail: !!u.thumb,
            mediaType: u.kind === "video" ? "VIDEO" : "PHOTO",
            visibility: "INTERNAL",
            reviewStatus: "PENDING",
            copyrightStatus: "UNKNOWN",
          })),
        },
      },
    });
    return { referenceCode: code, status: "NEW" };
  } catch (err) {
    await cleanup();
    throw err;
  }
}

export async function submitCaseSubmission(
  actor: Actor,
  input: SubmissionInput,
  image: File | null,
): Promise<{ referenceCode: string; status: "SUBMITTED" }> {
  await enforceRateLimit(RATE_LIMITS.submission, rateSubject(actor));
  const { uploads, cleanup } = await storeUploads(image ? [image] : [], {
    allowVideo: false,
    keyPrefix: "submissions",
    maxFiles: 1,
  });
  try {
    const code = referenceCode("M");
    await prisma.caseSubmission.create({
      data: {
        referenceCode: code,
        status: "SUBMITTED",
        originalPayload: originalPayload(input),
        personName: input.personName,
        age: input.age ?? null,
        gender: input.gender,
        missingSince: input.missingSince,
        missingPlace: input.missingPlace,
        description: input.description ?? null,
        circumstances: input.circumstances ?? null,
        sourceText: input.sourceText,
        sourceUrl: input.sourceUrl ?? null,
        contactEnc: encryptField(input.contact),
        reporterId: actor.user?.id ?? null,
        ipHash: actor.ipHash,
        attachments: {
          create: uploads.map((u) => ({
            storageKey: u.storageKey,
            mimeType: u.mimeType,
            sizeBytes: u.data.length,
            width: u.width,
            height: u.height,
            sha256: u.sha256,
            hasThumbnail: !!u.thumb,
            mediaType: "SEARCH_IMAGE",
            visibility: "INTERNAL",
            reviewStatus: "PENDING",
            copyrightStatus: "UNKNOWN",
          })),
        },
      },
    });
    return { referenceCode: code, status: "SUBMITTED" };
  } catch (err) {
    await cleanup();
    throw err;
  }
}

export async function submitContentReport(actor: Actor, publicNumber: string, input: ReportInput): Promise<{ ok: true }> {
  await enforceRateLimit(RATE_LIMITS.report, rateSubject(actor));
  const caseId = await findPublicCaseId(publicNumber, { activeOnly: false });
  await prisma.contentReport.create({
    data: {
      caseId,
      reason: input.reason,
      message: input.message,
      contactEnc: encryptField(input.contact),
      ipHash: actor.ipHash,
    },
  });
  return { ok: true };
}
