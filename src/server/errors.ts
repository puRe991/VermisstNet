export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/** Fachlicher Fehler mit sicherer, für Nutzer bestimmter Meldung. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, string[]>;
  readonly retryAfter?: number;

  constructor(
    code: ErrorCode,
    message: string,
    opts: { details?: Record<string, string[]>; retryAfter?: number } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.details = opts.details;
    this.retryAfter = opts.retryAfter;
  }
}

export const notFound = (what = "Eintrag") => new AppError("NOT_FOUND", `${what} nicht gefunden`);
export const forbidden = () => new AppError("FORBIDDEN", "Keine Berechtigung für diese Aktion");
export const unauthenticated = () => new AppError("UNAUTHENTICATED", "Anmeldung erforderlich");
export const conflict = (message: string) => new AppError("CONFLICT", message);
export const validation = (message: string, details?: Record<string, string[]>) =>
  new AppError("VALIDATION_ERROR", message, { details });
