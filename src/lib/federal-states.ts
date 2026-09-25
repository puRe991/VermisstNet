export const FEDERAL_STATES = [
  { code: "DE-BW", name: "Baden-Württemberg" },
  { code: "DE-BY", name: "Bayern" },
  { code: "DE-BE", name: "Berlin" },
  { code: "DE-BB", name: "Brandenburg" },
  { code: "DE-HB", name: "Bremen" },
  { code: "DE-HH", name: "Hamburg" },
  { code: "DE-HE", name: "Hessen" },
  { code: "DE-MV", name: "Mecklenburg-Vorpommern" },
  { code: "DE-NI", name: "Niedersachsen" },
  { code: "DE-NW", name: "Nordrhein-Westfalen" },
  { code: "DE-RP", name: "Rheinland-Pfalz" },
  { code: "DE-SL", name: "Saarland" },
  { code: "DE-SN", name: "Sachsen" },
  { code: "DE-ST", name: "Sachsen-Anhalt" },
  { code: "DE-SH", name: "Schleswig-Holstein" },
  { code: "DE-TH", name: "Thüringen" },
] as const;

export type FederalStateCode = (typeof FEDERAL_STATES)[number]["code"];

export const FEDERAL_STATE_CODES = FEDERAL_STATES.map((s) => s.code) as [FederalStateCode, ...FederalStateCode[]];

export function federalStateName(code: string | null | undefined): string | null {
  if (!code) return null;
  return FEDERAL_STATES.find((s) => s.code === code)?.name ?? null;
}
