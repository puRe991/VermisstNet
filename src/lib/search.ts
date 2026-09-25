/** Maximal berücksichtigte Suchbegriffe (Schutz vor teuren Abfragen). */
const MAX_TERMS = 8;
const MAX_TERM_LENGTH = 40;

/**
 * Zerlegt eine Suchanfrage in harmlose Tokens (nur Buchstaben/Ziffern).
 * Das Ergebnis wird als Präfix-Tsquery an PostgreSQL übergeben (zusätzlich parametrisiert).
 */
export function tokenizeQuery(q: string | null | undefined): string[] {
  if (!q) return [];
  return q
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.slice(0, MAX_TERM_LENGTH))
    .filter((t) => t.length > 0)
    .slice(0, MAX_TERMS);
}

/** "Hagen Innen" → "hagen:* & innen:*"; leere Eingabe → null */
export function buildPrefixTsQuery(q: string | null | undefined): string | null {
  const tokens = tokenizeQuery(q);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `${t}:*`).join(" & ");
}

const CASE_NUMBER_RE = /^VA-\d{4}-\d{6}$/i;

export function looksLikeCaseNumber(q: string | null | undefined): boolean {
  return !!q && CASE_NUMBER_RE.test(q.trim());
}
