import type { CaseStatusValue, GenderValue, PrivacyLevelValue } from "./enums";

export const MINOR_AGE_LIMIT = 18;

/** Ganze Lebensjahre zwischen zwei Daten (UTC-basiert, robust gegen Zeitzonen). */
export function yearsBetween(from: Date, to: Date): number {
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  const m = to.getUTCMonth() - from.getUTCMonth();
  if (m < 0 || (m === 0 && to.getUTCDate() < from.getUTCDate())) years--;
  return years;
}

/** Alter zum Zeitpunkt des Verschwindens (öffentlich wird nie das Geburtsdatum ausgegeben). */
export function ageAtMissing(
  person: { birthDate: Date | null; ageAtMissing: number | null },
  missingSince: Date,
): number | null {
  if (person.birthDate) return Math.max(0, yearsBetween(person.birthDate, missingSince));
  return person.ageAtMissing ?? null;
}

/** Unbekanntes Alter wird aus Vorsicht wie minderjährig behandelt. */
export function isMinor(age: number | null): boolean {
  return age === null || age < MINOR_AGE_LIMIT;
}

/** Öffentlich anzeigbarer Name gemäß Sichtbarkeitsstufe (null = anonymisiert). */
export function publicDisplayName(person: {
  firstName: string;
  lastName: string | null;
  privacyLevel: PrivacyLevelValue;
}): string | null {
  switch (person.privacyLevel) {
    case "FULL_NAME":
      return [person.firstName, person.lastName].filter(Boolean).join(" ");
    case "FIRST_NAME_INITIAL": {
      const initial = person.lastName?.trim().charAt(0);
      return initial ? `${person.firstName} ${initial.toUpperCase()}.` : person.firstName;
    }
    case "ANONYMIZED":
    default:
      return null;
  }
}

/** Substantiv + Adjektivendung nach grammatischem Geschlecht ("-jährige", "-jähriger", "-jähriges"). */
function personNoun(age: number | null, gender: GenderValue): { noun: string; ending: "e" | "er" | "es" } {
  if (age !== null && age < 14) {
    if (gender === "FEMALE") return { noun: "Mädchen", ending: "es" };
    if (gender === "MALE") return { noun: "Junge", ending: "er" };
    return { noun: "Kind", ending: "es" };
  }
  if (age !== null && age < 18) {
    if (gender === "FEMALE") return { noun: "Jugendliche", ending: "e" };
    if (gender === "MALE") return { noun: "Jugendlicher", ending: "er" };
    return { noun: "jugendliche Person", ending: "e" };
  }
  if (gender === "FEMALE") return { noun: "Frau", ending: "e" };
  if (gender === "MALE") return { noun: "Mann", ending: "er" };
  return { noun: "Person", ending: "e" };
}

/** Nüchterne Überschrift, z. B. "17-jährige Jugendliche vermisst". */
export function caseHeadline(age: number | null, gender: GenderValue, status: CaseStatusValue): string {
  const { noun, ending } = personNoun(age, gender);
  const subject = age !== null ? `${age}-jährig${ending} ${noun}` : noun;
  const suffix = status === "FOUND" ? "gefunden" : status === "ACTIVE" ? "vermisst" : "– Fall abgeschlossen";
  const text = `${subject} ${suffix}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
