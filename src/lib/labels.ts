import type {
  CaseStatusValue,
  CopyrightStatusValue,
  DecisionValue,
  GenderValue,
  HintStatusValue,
  HintTypeValue,
  LocationTypeValue,
  MediaTypeValue,
  PrivacyLevelValue,
  PublicationStatusValue,
  ReportReasonValue,
  ReportStatusValue,
  ReviewStatusValue,
  RoleValue,
  SourceTypeValue,
  SubmissionStatusValue,
  TimelineEventTypeValue,
  VisibilityValue,
} from "./enums";

export const ROLE_LABELS: Record<RoleValue, string> = {
  VISITOR: "Besucher",
  REPORTER: "Melder",
  MODERATOR: "Moderator",
  EDITOR: "Redakteur",
  ADMINISTRATOR: "Administrator",
};

export const GENDER_LABELS: Record<GenderValue, string> = {
  FEMALE: "weiblich",
  MALE: "männlich",
  DIVERSE: "divers",
  UNKNOWN: "unbekannt",
};

export const PRIVACY_LEVEL_LABELS: Record<PrivacyLevelValue, string> = {
  FULL_NAME: "Vollständiger Name",
  FIRST_NAME_INITIAL: "Vorname + Initial",
  ANONYMIZED: "Anonymisiert (kein Name)",
};

export const CASE_STATUS_LABELS: Record<CaseStatusValue, string> = {
  ACTIVE: "Aktive Vermisstensuche",
  FOUND: "Person gefunden",
  CLOSED: "Fall abgeschlossen",
  ARCHIVED: "Archiviert",
};

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatusValue, string> = {
  DRAFT: "Entwurf",
  PUBLISHED: "Veröffentlicht",
  UNPUBLISHED: "Zurückgezogen",
};

export const LOCATION_TYPE_LABELS: Record<LocationTypeValue, string> = {
  MISSING_LOCATION: "Vermisstenort",
  LAST_KNOWN_LOCATION: "Letzter bestätigter Aufenthaltsort",
  SIGHTING: "Sichtung",
  POSSIBLE_LOCATION: "Möglicher Aufenthaltsort",
  TRAVEL_POINT: "Reisewegpunkt",
};

export const VISIBILITY_LABELS: Record<VisibilityValue, string> = {
  PUBLIC: "Öffentlich",
  INTERNAL: "Intern",
};

export const SOURCE_TYPE_LABELS: Record<SourceTypeValue, string> = {
  OFFICIAL_AUTHORITY: "Behörde",
  POLICE: "Polizei",
  ORGANIZATION: "Organisation",
  FAMILY: "Angehörige",
  MEDIA: "Medien",
  USER_REPORT: "Nutzermeldung",
  OTHER: "Sonstige",
};

export const MEDIA_TYPE_LABELS: Record<MediaTypeValue, string> = {
  SEARCH_IMAGE: "Suchbild",
  PHOTO: "Foto",
  VIDEO: "Video",
};

export const COPYRIGHT_STATUS_LABELS: Record<CopyrightStatusValue, string> = {
  OFFICIAL_RELEASE: "Behördliche Freigabe",
  PERMISSION_GRANTED: "Einverständnis liegt vor",
  LICENSED: "Freie Lizenz",
  UNKNOWN: "Ungeklärt",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatusValue, string> = {
  PENDING: "Ausstehend",
  APPROVED: "Freigegeben",
  REJECTED: "Abgelehnt",
};

export const TIMELINE_EVENT_TYPE_LABELS: Record<TimelineEventTypeValue, string> = {
  MISSING: "Vermisst",
  POLICE_REPORT: "Polizeiliche Meldung",
  PUBLIC_SEARCH: "Öffentliche Fahndung",
  SIGHTING: "Sichtung",
  NEW_INFORMATION: "Neue Information",
  LOCATION_UPDATE: "Ortsaktualisierung",
  SOURCE_UPDATE: "Quellenaktualisierung",
  STATUS_CHANGE: "Statusänderung",
  FOUND: "Gefunden",
};

export const HINT_TYPE_LABELS: Record<HintTypeValue, string> = {
  PERSON_SEEN: "Person gesehen",
  POSSIBLE_LOCATION: "Möglicher Aufenthaltsort",
  VEHICLE: "Fahrzeug",
  POSSIBLE_ROUTE: "Möglicher Reiseweg",
  PHOTO: "Foto",
  VIDEO: "Video",
  NEW_INFORMATION: "Neue Information",
  OTHER: "Sonstiger Hinweis",
};

export const HINT_STATUS_LABELS: Record<HintStatusValue, string> = {
  NEW: "Neu",
  UNDER_REVIEW: "In Prüfung",
  REQUIRES_INFORMATION: "Rückfrage",
  VERIFIED: "Bestätigt",
  REJECTED: "Abgelehnt",
  FORWARDED: "Weitergeleitet",
  ARCHIVED: "Archiviert",
};

export const DECISION_LABELS: Record<DecisionValue, string> = {
  CONFIRM: "Bestätigen",
  DEFER: "Zurückstellen",
  REQUEST_INFO: "Rückfrage",
  REJECT: "Ablehnen",
  FORWARD: "Intern weiterleiten",
  ARCHIVE: "Archivieren",
  NOTE: "Notiz",
};

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatusValue, string> = {
  SUBMITTED: "Eingereicht",
  REVIEW: "In Prüfung",
  SOURCE_VERIFICATION: "Quellenprüfung",
  APPROVED: "Freigegeben (Entwurf)",
  PUBLISHED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
};

export const REPORT_REASON_LABELS: Record<ReportReasonValue, string> = {
  INCORRECT_INFORMATION: "Falsche Information",
  PRIVACY_CONCERN: "Datenschutzbedenken",
  PERSON_FOUND: "Person wurde gefunden",
  COPYRIGHT: "Urheberrecht",
  OTHER: "Sonstiges",
};

export const REPORT_STATUS_LABELS: Record<ReportStatusValue, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Bearbeitung",
  RESOLVED: "Erledigt",
  DISMISSED: "Verworfen",
};

export const COMPUTED_LABEL = "Automatisch berechnet / nicht bestätigt";
export const DEMO_LABEL = "DEMO DATA";
