/**
 * Normalisiert Freitext aus Formularen: Unicode-NFC, Steuerzeichen entfernen
 * (außer Zeilenumbruch/Tab), Zeilenenden vereinheitlichen, trimmen.
 * HTML wird NICHT entfernt, sondern beim Rendern von React escaped.
 */
export function normalizeText(input: string): string {
  return (
    input
      .normalize("NFC")
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim()
  );
}

const STREET_ADDRESS_RE =
  /\b[\p{L}.-]*(straße|strasse|str\.|weg|allee|platz|gasse|ring|damm|ufer|chaussee|steig|pfad)\s*\d{1,4}\s*[a-z]?\b/iu;

/** Heuristik: enthält der Text eine Straßenadresse mit Hausnummer? */
export function looksLikeStreetAddress(input: string): boolean {
  return STREET_ADDRESS_RE.test(input);
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
