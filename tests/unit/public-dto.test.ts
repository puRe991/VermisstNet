import { describe, expect, it } from "vitest";
import { toPublicCaseDetail } from "@/server/dto/public";

// Absichtlich "verschmutzte" Zeile: enthält interne Felder, die der Mapper NICHT übernehmen darf.
function row(status: "ACTIVE" | "FOUND" = "ACTIVE") {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    publicNumber: "VA-2026-000001",
    status,
    isUrgent: true,
    missingSince: new Date("2026-09-06T12:00:00Z"),
    missingPlace: "Hagen, Innenstadt",
    city: "Hagen",
    federalState: "DE-NW",
    isDemo: false,
    lastKnownPlace: "Hagen Hbf",
    circumstances: "öffentlich",
    clothing: "schwarzes Kopftuch",
    responsibleAuthority: "Polizei",
    authorityContact: "110",
    publishedAt: new Date(),
    updatedAt: new Date(),
    internalNotes: "SECRET-NOTE",
    internalReference: "SECRET-REF",
    person: {
      firstName: "Mira",
      lastName: "Geheimnachname",
      privacyLevel: "FIRST_NAME_INITIAL" as const,
      birthDate: new Date("2009-03-15"),
      ageAtMissing: null,
      gender: "FEMALE" as const,
      heightCm: 165,
      build: "schlank",
      hairColor: "dunkel",
      eyeColor: "braun",
      distinguishingFeatures: null,
      description: null,
    },
    media: [
      { id: "m1", title: null, sourceText: null, copyrightStatus: "OFFICIAL_RELEASE" as const, isPrimary: true, hasThumbnail: true, width: 1, height: 1, storageKey: "SECRET-KEY" },
    ],
    locations: [
      { id: "l1", type: "MISSING_LOCATION" as const, label: "Hagen", latitude: 51.35947, longitude: 7.47318, precisionM: 100, observedAt: null, isConfirmed: true },
    ],
    sources: [
      { id: "s1", sourceType: "POLICE" as const, organization: "Polizei", title: "Meldung", url: null, publicationDate: null, verifiedAt: new Date(), notes: "SECRET-SOURCE-NOTE", verifiedById: "SECRET-USER" },
    ],
    timelineEvents: [
      { id: "t1", type: "MISSING" as const, occurredAt: new Date(), description: "vermisst", source: { title: "Q", organization: null, url: null, verifiedAt: null } },
    ],
  };
}

describe("Öffentliches Fall-DTO (Allowlist)", () => {
  it("gibt keine internen Felder aus", () => {
    const out = JSON.stringify(toPublicCaseDetail(row() as never));
    for (const secret of ["SECRET-NOTE", "SECRET-REF", "SECRET-KEY", "SECRET-SOURCE-NOTE", "SECRET-USER", "Geheimnachname", "2009-03-15", "birthDate", "storageKey"]) {
      expect(out, secret).not.toContain(secret);
    }
  });
  it("zeigt Namen gemäß Sichtbarkeitsstufe und berechnet nur das Alter", () => {
    const out = toPublicCaseDetail(row() as never);
    expect(out.displayName).toBe("Mira G.");
    expect(out.age).toBe(17);
    expect(out.headline).toBe("17-jährige Jugendliche vermisst");
  });
  it("generalisiert Koordinaten (Minderjährige: grobes Raster)", () => {
    const out = toPublicCaseDetail(row() as never);
    expect(out.locations[0]!.lat).toBe(51.36);
    expect(out.locations[0]!.lng).toBe(7.48);
    expect(out.locations[0]!.precisionM).toBeGreaterThanOrEqual(2000);
  });
  it("zeigt unverifizierte Quellen in der Timeline nicht an", () => {
    expect(toPublicCaseDetail(row() as never).timeline[0]!.source).toBeNull();
  });
  it("reduziert gefundene Fälle (keine Bilder, Orte, Beschreibung)", () => {
    const out = toPublicCaseDetail(row("FOUND") as never);
    expect(out.reduced).toBe(true);
    expect(out.images).toEqual([]);
    expect(out.locations).toEqual([]);
    expect(out.person).toBeNull();
    expect(out.primaryImage).toBeNull();
    expect(out.isUrgent).toBe(false);
  });
});
