import { describe, expect, it } from "vitest";
import { canTransitionCase, nextHintStatus, nextReportStatus, nextSubmissionStatus } from "@/lib/workflow";

describe("Hinweis-Workflow", () => {
  it("bildet Entscheidungen auf Status ab", () => {
    expect(nextHintStatus("NEW", "CONFIRM")).toBe("VERIFIED");
    expect(nextHintStatus("NEW", "DEFER")).toBe("UNDER_REVIEW");
    expect(nextHintStatus("NEW", "REQUEST_INFO")).toBe("REQUIRES_INFORMATION");
    expect(nextHintStatus("UNDER_REVIEW", "REJECT")).toBe("REJECTED");
    expect(nextHintStatus("UNDER_REVIEW", "FORWARD")).toBe("FORWARDED");
    expect(nextHintStatus("VERIFIED", "ARCHIVE")).toBe("ARCHIVED");
    expect(nextHintStatus("NEW", "NOTE")).toBe("NEW");
  });
  it("verhindert unzulässige Übergänge", () => {
    expect(nextHintStatus("ARCHIVED", "CONFIRM")).toBeNull();
    expect(nextHintStatus("REJECTED", "CONFIRM")).toBeNull();
    expect(nextHintStatus("REJECTED", "FORWARD")).toBeNull();
  });
});

describe("Fallmeldungs-Workflow", () => {
  it("folgt SUBMITTED → REVIEW → SOURCE_VERIFICATION → APPROVED", () => {
    expect(nextSubmissionStatus("SUBMITTED", "CONFIRM")).toBe("REVIEW");
    expect(nextSubmissionStatus("REVIEW", "CONFIRM")).toBe("SOURCE_VERIFICATION");
    expect(nextSubmissionStatus("SOURCE_VERIFICATION", "CONFIRM")).toBe("APPROVED");
  });
  it("PUBLISHED wird nie direkt durch Moderation gesetzt", () => {
    expect(nextSubmissionStatus("APPROVED", "CONFIRM")).toBeNull();
  });
  it("Ablehnung ist aus jedem offenen Schritt möglich", () => {
    for (const s of ["SUBMITTED", "REVIEW", "SOURCE_VERIFICATION"] as const) {
      expect(nextSubmissionStatus(s, "REJECT")).toBe("REJECTED");
    }
    expect(nextSubmissionStatus("REJECTED", "CONFIRM")).toBeNull();
  });
  it("Rückfrage/Zurückstellen ändern den Status nicht", () => {
    expect(nextSubmissionStatus("REVIEW", "REQUEST_INFO")).toBe("REVIEW");
    expect(nextSubmissionStatus("REVIEW", "DEFER")).toBe("REVIEW");
  });
});

describe("Fallstatus", () => {
  it("erlaubt nur definierte Übergänge", () => {
    expect(canTransitionCase("ACTIVE", "FOUND")).toBe(true);
    expect(canTransitionCase("ARCHIVED", "ACTIVE")).toBe(false);
    expect(canTransitionCase("CLOSED", "FOUND")).toBe(false);
  });
});

describe("Gemeldete Inhalte", () => {
  it("bestätigen → erledigt, ablehnen → verworfen", () => {
    expect(nextReportStatus("OPEN", "CONFIRM")).toBe("RESOLVED");
    expect(nextReportStatus("OPEN", "REJECT")).toBe("DISMISSED");
    expect(nextReportStatus("RESOLVED", "DEFER")).toBeNull();
  });
});
