import type {
  CaseStatusValue,
  DecisionValue,
  HintStatusValue,
  ReportStatusValue,
  SubmissionStatusValue,
} from "./enums";

// ───────────────────────────── Hinweise ─────────────────────────────

/** Terminale Hinweis-Status, aus denen nur noch archiviert werden kann. */
const HINT_CLOSED: HintStatusValue[] = ["VERIFIED", "REJECTED", "FORWARDED"];

/**
 * Bildet eine Moderationsentscheidung auf den neuen Hinweis-Status ab.
 * Gibt `null` zurück, wenn die Entscheidung im aktuellen Status nicht zulässig ist.
 */
export function nextHintStatus(current: HintStatusValue, decision: DecisionValue): HintStatusValue | null {
  if (current === "ARCHIVED") return decision === "NOTE" ? current : null;
  switch (decision) {
    case "NOTE":
      return current;
    case "ARCHIVE":
      return "ARCHIVED";
    case "CONFIRM":
      return HINT_CLOSED.includes(current) && current !== "VERIFIED" ? null : "VERIFIED";
    case "DEFER":
      // zurückstellen = in Prüfung belassen / wieder in Prüfung nehmen
      return HINT_CLOSED.includes(current) ? null : "UNDER_REVIEW";
    case "REQUEST_INFO":
      return HINT_CLOSED.includes(current) ? null : "REQUIRES_INFORMATION";
    case "REJECT":
      return current === "REJECTED" ? null : "REJECTED";
    case "FORWARD":
      return current === "REJECTED" ? null : "FORWARDED";
    default:
      return null;
  }
}

// ─────────────────────────── Fallmeldungen ───────────────────────────

/** Linearer Freigabeweg: SUBMITTED → REVIEW → SOURCE_VERIFICATION → APPROVED (→ PUBLISHED über Fall) */
const SUBMISSION_FORWARD: Partial<Record<SubmissionStatusValue, SubmissionStatusValue>> = {
  SUBMITTED: "REVIEW",
  REVIEW: "SOURCE_VERIFICATION",
  SOURCE_VERIFICATION: "APPROVED",
};

export const SUBMISSION_TERMINAL: SubmissionStatusValue[] = ["APPROVED", "PUBLISHED", "REJECTED"];

/**
 * Neuer Status einer Fallmeldung nach einer Entscheidung.
 * DEFER / REQUEST_INFO / FORWARD / NOTE verändern den Status nicht (werden aber protokolliert).
 * PUBLISHED wird ausschließlich durch die Veröffentlichung des Falls gesetzt.
 */
export function nextSubmissionStatus(
  current: SubmissionStatusValue,
  decision: DecisionValue,
): SubmissionStatusValue | null {
  if (decision === "NOTE") return current;
  if (SUBMISSION_TERMINAL.includes(current)) return null;
  switch (decision) {
    case "CONFIRM":
      return SUBMISSION_FORWARD[current] ?? null;
    case "REJECT":
      return "REJECTED";
    case "DEFER":
    case "REQUEST_INFO":
    case "FORWARD":
      return current;
    default:
      return null;
  }
}

// ─────────────────────────── Gemeldete Inhalte ───────────────────────────

export function nextReportStatus(current: ReportStatusValue, decision: DecisionValue): ReportStatusValue | null {
  switch (decision) {
    case "NOTE":
      return current;
    case "CONFIRM":
      return "RESOLVED";
    case "REJECT":
      return "DISMISSED";
    case "DEFER":
    case "REQUEST_INFO":
    case "FORWARD":
      return current === "RESOLVED" || current === "DISMISSED" ? null : "IN_PROGRESS";
    case "ARCHIVE":
      return current === "OPEN" ? "DISMISSED" : current;
    default:
      return null;
  }
}

// ─────────────────────────── Fallstatus ───────────────────────────

/** Zulässige Übergänge des Fallstatus */
const CASE_TRANSITIONS: Record<CaseStatusValue, CaseStatusValue[]> = {
  ACTIVE: ["FOUND", "CLOSED", "ARCHIVED"],
  FOUND: ["ACTIVE", "CLOSED", "ARCHIVED"],
  CLOSED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: ["CLOSED"],
};

export function canTransitionCase(from: CaseStatusValue, to: CaseStatusValue): boolean {
  return from === to || CASE_TRANSITIONS[from].includes(to);
}
