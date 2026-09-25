import { describe, expect, it } from "vitest";
import { generalizeCoordinate, parseBBox } from "@/lib/geo";
import { ageAtMissing, caseHeadline, isMinor, publicDisplayName } from "@/lib/person";

describe("Koordinaten-Generalisierung", () => {
  it("rundet auf ein 0,01°-Raster", () => {
    const g = generalizeCoordinate(51.35947, 7.47318, { minor: false, precisionM: 100 });
    expect(g).toEqual({ lat: 51.36, lng: 7.47, precisionM: 1113 });
  });
  it("gröberes Raster für Minderjährige", () => {
    const g = generalizeCoordinate(51.35947, 7.47318, { minor: true, precisionM: 100 });
    expect(g.lat).toBe(51.36);
    expect(g.lng).toBe(7.48);
    expect(g.precisionM).toBeGreaterThan(2000);
  });
  it("verschlechtert nie die angegebene Ungenauigkeit", () => {
    expect(generalizeCoordinate(50, 8, { minor: false, precisionM: 5000 }).precisionM).toBe(5000);
  });
  it("validiert BBox", () => {
    expect(parseBBox("6,50,8,52")).toEqual({ minLng: 6, minLat: 50, maxLng: 8, maxLat: 52 });
    expect(parseBBox("8,50,6,52")).toBeNull();
    expect(parseBBox("1,2,3")).toBeNull();
    expect(parseBBox("a,b,c,d")).toBeNull();
  });
});

describe("Personendarstellung", () => {
  it("Name gemäß Sichtbarkeitsstufe", () => {
    const p = { firstName: "Erika", lastName: "Mustermann" };
    expect(publicDisplayName({ ...p, privacyLevel: "FULL_NAME" })).toBe("Erika Mustermann");
    expect(publicDisplayName({ ...p, privacyLevel: "FIRST_NAME_INITIAL" })).toBe("Erika M.");
    expect(publicDisplayName({ ...p, privacyLevel: "ANONYMIZED" })).toBeNull();
  });
  it("Alter zum Zeitpunkt des Verschwindens", () => {
    expect(ageAtMissing({ birthDate: new Date("2009-09-07"), ageAtMissing: null }, new Date("2026-09-06"))).toBe(16);
    expect(ageAtMissing({ birthDate: new Date("2009-09-06"), ageAtMissing: null }, new Date("2026-09-06"))).toBe(17);
    expect(ageAtMissing({ birthDate: null, ageAtMissing: 40 }, new Date())).toBe(40);
  });
  it("unbekanntes Alter gilt als schutzbedürftig", () => {
    expect(isMinor(null)).toBe(true);
    expect(isMinor(17)).toBe(true);
    expect(isMinor(18)).toBe(false);
  });
  it("nüchterne Überschriften", () => {
    expect(caseHeadline(17, "FEMALE", "ACTIVE")).toBe("17-jährige Jugendliche vermisst");
    expect(caseHeadline(17, "MALE", "ACTIVE")).toBe("17-jähriger Jugendlicher vermisst");
    expect(caseHeadline(11, "MALE", "ACTIVE")).toBe("11-jähriger Junge vermisst");
    expect(caseHeadline(8, "FEMALE", "ACTIVE")).toBe("8-jähriges Mädchen vermisst");
    expect(caseHeadline(79, "FEMALE", "FOUND")).toBe("79-jährige Frau gefunden");
    expect(caseHeadline(null, "UNKNOWN", "ACTIVE")).toBe("Person vermisst");
  });
});
