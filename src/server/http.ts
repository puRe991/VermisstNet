import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";
import { formEntriesToObject } from "@/lib/validation/public";
import { getActorFromRequest, requireStaff, type Actor } from "./auth/actor";
import { AppError } from "./errors";

type RouteContext<P> = { params: Promise<P> };

type Handler<P> = (args: { req: NextRequest; actor: Actor; params: P }) => Promise<Response>;

/**
 * Einheitlicher Wrapper für Route Handler: Actor ermitteln, Fehler in sichere JSON-Antworten
 * übersetzen, keine internen Details nach außen geben.
 */
export function apiHandler<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    try {
      const actor = await getActorFromRequest(req);
      // Basisschutz: interne Endpunkte prüfen die Anmeldung, BEVOR der Body gelesen/validiert wird.
      // Die feingranulare Prüfung erfolgt zusätzlich im Service-Layer.
      if (req.nextUrl.pathname.startsWith("/api/admin/")) requireStaff(actor, "admin.access");
      const params = (await ctx?.params) ?? ({} as P);
      return await handler({ req, actor, params });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    const res = NextResponse.json(
      { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } },
      { status: err.status },
    );
    if (err.retryAfter) res.headers.set("Retry-After", String(err.retryAfter));
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  if (err instanceof ZodError) {
    return json({ error: { code: "VALIDATION_ERROR", message: "Eingaben prüfen", details: zodDetails(err) } }, 400);
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return json({ error: { code: "NOT_FOUND", message: "Eintrag nicht gefunden" } }, 404);
    if (err.code === "P2002") return json({ error: { code: "CONFLICT", message: "Eintrag existiert bereits" } }, 409);
  }
  console.error("[api] unerwarteter Fehler", err);
  return json({ error: { code: "INTERNAL_ERROR", message: "Interner Fehler. Bitte später erneut versuchen." } }, 500);
}

export function zodDetails(err: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

export function json(data: unknown, status = 200, opts: { publicCache?: boolean } = {}): Response {
  const res = NextResponse.json(data, { status });
  res.headers.set(
    "Cache-Control",
    opts.publicCache ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store",
  );
  return res;
}

/** Validiert einen Wert gegen ein Schema und wirft einen 400er mit Felddetails. */
export function parseWith<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const r = schema.safeParse(value);
  if (!r.success) throw new AppError("VALIDATION_ERROR", "Eingaben prüfen", { details: zodDetails(r.error) });
  return r.data;
}

const MAX_JSON_BYTES = 256 * 1024;

export async function readJson(req: NextRequest): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new AppError("UNSUPPORTED_MEDIA_TYPE", "JSON erwartet");
  const text = await req.text();
  if (text.length > MAX_JSON_BYTES) throw new AppError("PAYLOAD_TOO_LARGE", "Anfrage zu groß");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new AppError("VALIDATION_ERROR", "Ungültiges JSON");
  }
}

const MAX_MULTIPART_BYTES = 80 * 1024 * 1024;

/** JSON oder multipart/form-data → { fields, form } */
export async function readBody(req: NextRequest): Promise<{ fields: Record<string, unknown>; form: FormData | null }> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) {
    const len = Number(req.headers.get("content-length") ?? "0");
    if (len > MAX_MULTIPART_BYTES) throw new AppError("PAYLOAD_TOO_LARGE", "Anfrage zu groß");
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError("VALIDATION_ERROR", "Ungültige Formulardaten");
    }
    return { fields: formEntriesToObject(form.entries()), form };
  }
  const data = await readJson(req);
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new AppError("VALIDATION_ERROR", "Objekt erwartet");
  }
  return { fields: data as Record<string, unknown>, form: null };
}

export function searchParamsObject(req: NextRequest): Record<string, unknown> {
  return formEntriesToObject(req.nextUrl.searchParams.entries());
}

/** UUID-Pfadparameter prüfen; ungültige IDs verhalten sich wie nicht vorhandene. */
export function uuidParam(id: string, what = "Eintrag"): string {
  if (!z.uuid().safeParse(id).success) throw new AppError("NOT_FOUND", `${what} nicht gefunden`);
  return id;
}
