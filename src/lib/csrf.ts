/**
 * CSRF-Schutz für mutierende API-Anfragen (Edge-kompatibel, ohne Node-APIs).
 * Erlaubt nur Anfragen, deren Origin (oder ersatzweise Referer) zur eigenen Origin gehört.
 */
export function isSameOriginRequest(opts: {
  method: string;
  origin: string | null;
  referer: string | null;
  allowedOrigins: string[];
}): boolean {
  const method = opts.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  const allowed = new Set(opts.allowedOrigins.map(normalizeOrigin).filter(Boolean) as string[]);
  if (opts.origin && opts.origin !== "null") return allowed.has(normalizeOrigin(opts.origin) ?? "");
  if (opts.referer) return allowed.has(normalizeOrigin(opts.referer) ?? "");
  // Weder Origin noch Referer: moderne Browser senden bei POST immer Origin → ablehnen
  return false;
}

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
