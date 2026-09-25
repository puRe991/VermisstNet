import { describe, expect, it } from "vitest";
import { caseCreateSchema, locationSchema, sourceSchema } from "@/lib/validation/admin";
import { caseListQuerySchema, hintSchema, submissionSchema } from "@/lib/validation/public";
import { looksLikeStreetAddress, normalizeText } from "@/lib/text";

const baseSubmission = {
  personName: "Erika Beispiel",
  age: "17",
  gender: "FEMALE",
  missingSince: "2026-09-06",
  missingPlace: "Hagen, Innenstadt",
  sourceText: "Pressemitteilung der Polizei",
  consent: "on",
};

describe("Vermisstenmeldung", () => {
  it("akzeptiert gültige Eingaben", () => {
    const r = submissionSchema.safeParse(baseSubmission);
    expect(r.success).toBe(true);
  });
  it("verlangt die Datenschutz-Einwilligung", () => {
    expect(submissionSchema.safeParse({ ...baseSubmission, consent: undefined }).success).toBe(false);
  });
  it("lehnt genaue Adressen ab (Datenminimierung)", () => {
    const r = submissionSchema.safeParse({ ...baseSubmission, missingPlace: "Musterstraße 12, Hagen" });
    expect(r.success).toBe(false);
  });
  it("lehnt ausgefüllten Honeypot ab", () => {
    expect(submissionSchema.safeParse({ ...baseSubmission, website: "http://spam" }).success).toBe(false);
  });
  it("lehnt Datum in der Zukunft ab", () => {
    expect(submissionSchema.safeParse({ ...baseSubmission, missingSince: "2999-01-01" }).success).toBe(false);
  });
  it("lehnt javascript:-URLs ab (XSS)", () => {
    expect(submissionSchema.safeParse({ ...baseSubmission, sourceUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...baseSubmission, sourceUrl: "data:text/html,<script>" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...baseSubmission, sourceUrl: "https://polizei.example/" }).success).toBe(true);
  });
  it("speichert HTML als Text (Escaping erfolgt beim Rendern) und entfernt Steuerzeichen", () => {
    const r = submissionSchema.parse({ ...baseSubmission, description: "<script>alert(1)</script>\u0000‮" });
    expect(r.description).toBe("<script>alert(1)</script>");
  });
});

describe("Hinweis", () => {
  it("verlangt Kontakt bei nicht-anonymen Hinweisen", () => {
    const r = hintSchema.safeParse({ hintType: "PERSON_SEEN", description: "Person am Bahnhof gesehen", isAnonymous: "false", consent: "true" });
    expect(r.success).toBe(false);
  });
  it("verlangt Breite und Länge gemeinsam", () => {
    const r = hintSchema.safeParse({ hintType: "PERSON_SEEN", description: "Person am Bahnhof gesehen", latitude: "51.3", consent: "true" });
    expect(r.success).toBe(false);
  });
  it("lehnt unbekannte Hinweisarten ab", () => {
    expect(hintSchema.safeParse({ hintType: "DROP TABLE", description: "xxxxxxxxxxxx", consent: "true" }).success).toBe(false);
  });
});

describe("Admin-Validierung", () => {
  it("Orte: Mindestgenauigkeit 100 m", () => {
    const r = locationSchema.safeParse({ type: "SIGHTING", label: "Hagen", latitude: 51, longitude: 7, precisionM: 10 });
    expect(r.success).toBe(false);
  });
  it("Quellen: nur http(s)-Links", () => {
    expect(sourceSchema.safeParse({ sourceType: "POLICE", title: "Meldung", url: "javascript:alert(1)" }).success).toBe(false);
  });
  it("Fall: Adresse im Vermisstenort wird abgelehnt", () => {
    const r = caseCreateSchema.safeParse({
      person: { firstName: "A", gender: "UNKNOWN", privacyLevel: "ANONYMIZED" },
      missingSince: "2026-01-01",
      missingPlace: "Hauptstraße 5",
    });
    expect(r.success).toBe(false);
  });
});

describe("Suchfilter", () => {
  it("ignoriert ungültige Statuswerte nicht still, sondern lehnt ab", () => {
    expect(caseListQuerySchema.safeParse({ status: "ARCHIVED" }).success).toBe(false);
  });
  it("begrenzt die Seitengröße", () => {
    expect(caseListQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });
});

describe("Textnormalisierung", () => {
  it("erkennt Adressen", () => {
    expect(looksLikeStreetAddress("Bahnhofstraße 7")).toBe(true);
    expect(looksLikeStreetAddress("Am Ring 12a")).toBe(true);
    expect(looksLikeStreetAddress("Hagen, Innenstadt")).toBe(false);
  });
  it("normalisiert Zeilenumbrüche", () => {
    expect(normalizeText("a\r\nb")).toBe("a\nb");
  });
});
