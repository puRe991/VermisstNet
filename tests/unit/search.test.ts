import { describe, expect, it } from "vitest";
import { buildPrefixTsQuery, looksLikeCaseNumber, tokenizeQuery } from "@/lib/search";

describe("Suchanfragen-Bereinigung", () => {
  it("erzeugt Präfix-Suchen", () => {
    expect(buildPrefixTsQuery("Hagen Innen")).toBe("hagen:* & innen:*");
  });
  it("entfernt SQL-/tsquery-Sonderzeichen vollständig", () => {
    const q = buildPrefixTsQuery("'; DROP TABLE cases; -- | ! & :* ( )");
    expect(q).toBe("drop:* & table:* & cases:*");
    expect(q).not.toMatch(/[';|!()]/);
  });
  it("unterstützt Umlaute", () => {
    expect(tokenizeQuery("Müller Düsseldorf")).toEqual(["müller", "düsseldorf"]);
  });
  it("begrenzt die Anzahl der Begriffe", () => {
    expect(tokenizeQuery("a b c d e f g h i j k").length).toBe(8);
  });
  it("leere Eingaben → keine Suche", () => {
    expect(buildPrefixTsQuery("  ;; ")).toBeNull();
  });
  it("erkennt Fallnummern", () => {
    expect(looksLikeCaseNumber("va-2026-000001")).toBe(true);
    expect(looksLikeCaseNumber("VA-2026-1")).toBe(false);
  });
});
