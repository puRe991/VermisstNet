// Enum-Werte als isomorphe Konstanten (Client-Komponenten dürfen @prisma/client nicht importieren).
// Die Übereinstimmung mit dem Prisma-Schema wird in src/server/enum-check.ts typgeprüft.

export const ROLES = ["VISITOR", "REPORTER", "MODERATOR", "EDITOR", "ADMINISTRATOR"] as const;
export type RoleValue = (typeof ROLES)[number];

export const GENDERS = ["FEMALE", "MALE", "DIVERSE", "UNKNOWN"] as const;
export type GenderValue = (typeof GENDERS)[number];

export const PRIVACY_LEVELS = ["FULL_NAME", "FIRST_NAME_INITIAL", "ANONYMIZED"] as const;
export type PrivacyLevelValue = (typeof PRIVACY_LEVELS)[number];

export const CASE_STATUSES = ["ACTIVE", "FOUND", "CLOSED", "ARCHIVED"] as const;
export type CaseStatusValue = (typeof CASE_STATUSES)[number];
/** Status, die öffentlich überhaupt sichtbar sein können */
export const PUBLIC_CASE_STATUSES = ["ACTIVE", "FOUND", "CLOSED"] as const;
export type PublicCaseStatusValue = (typeof PUBLIC_CASE_STATUSES)[number];

export const PUBLICATION_STATUSES = ["DRAFT", "PUBLISHED", "UNPUBLISHED"] as const;
export type PublicationStatusValue = (typeof PUBLICATION_STATUSES)[number];

export const LOCATION_TYPES = [
  "MISSING_LOCATION",
  "LAST_KNOWN_LOCATION",
  "SIGHTING",
  "POSSIBLE_LOCATION",
  "TRAVEL_POINT",
] as const;
export type LocationTypeValue = (typeof LOCATION_TYPES)[number];

export const VISIBILITIES = ["PUBLIC", "INTERNAL"] as const;
export type VisibilityValue = (typeof VISIBILITIES)[number];

export const SOURCE_TYPES = [
  "OFFICIAL_AUTHORITY",
  "POLICE",
  "ORGANIZATION",
  "FAMILY",
  "MEDIA",
  "USER_REPORT",
  "OTHER",
] as const;
export type SourceTypeValue = (typeof SOURCE_TYPES)[number];
/** Quellen, die für die Veröffentlichung von Fällen Minderjähriger erforderlich sind */
export const AUTHORITY_SOURCE_TYPES: readonly SourceTypeValue[] = ["POLICE", "OFFICIAL_AUTHORITY"];

export const MEDIA_TYPES = ["SEARCH_IMAGE", "PHOTO", "VIDEO"] as const;
export type MediaTypeValue = (typeof MEDIA_TYPES)[number];

export const COPYRIGHT_STATUSES = ["OFFICIAL_RELEASE", "PERMISSION_GRANTED", "LICENSED", "UNKNOWN"] as const;
export type CopyrightStatusValue = (typeof COPYRIGHT_STATUSES)[number];

export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ReviewStatusValue = (typeof REVIEW_STATUSES)[number];

export const TIMELINE_EVENT_TYPES = [
  "MISSING",
  "POLICE_REPORT",
  "PUBLIC_SEARCH",
  "SIGHTING",
  "NEW_INFORMATION",
  "LOCATION_UPDATE",
  "SOURCE_UPDATE",
  "STATUS_CHANGE",
  "FOUND",
] as const;
export type TimelineEventTypeValue = (typeof TIMELINE_EVENT_TYPES)[number];

export const HINT_TYPES = [
  "PERSON_SEEN",
  "POSSIBLE_LOCATION",
  "VEHICLE",
  "POSSIBLE_ROUTE",
  "PHOTO",
  "VIDEO",
  "NEW_INFORMATION",
  "OTHER",
] as const;
export type HintTypeValue = (typeof HINT_TYPES)[number];

export const HINT_STATUSES = [
  "NEW",
  "UNDER_REVIEW",
  "REQUIRES_INFORMATION",
  "VERIFIED",
  "REJECTED",
  "FORWARDED",
  "ARCHIVED",
] as const;
export type HintStatusValue = (typeof HINT_STATUSES)[number];

export const DECISIONS = ["CONFIRM", "DEFER", "REQUEST_INFO", "REJECT", "FORWARD", "ARCHIVE", "NOTE"] as const;
export type DecisionValue = (typeof DECISIONS)[number];

export const SUBMISSION_STATUSES = [
  "SUBMITTED",
  "REVIEW",
  "SOURCE_VERIFICATION",
  "APPROVED",
  "PUBLISHED",
  "REJECTED",
] as const;
export type SubmissionStatusValue = (typeof SUBMISSION_STATUSES)[number];

export const REPORT_REASONS = [
  "INCORRECT_INFORMATION",
  "PRIVACY_CONCERN",
  "PERSON_FOUND",
  "COPYRIGHT",
  "OTHER",
] as const;
export type ReportReasonValue = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"] as const;
export type ReportStatusValue = (typeof REPORT_STATUSES)[number];

export const REVIEW_ENTITIES = ["HINT", "SUBMISSION", "SOURCE", "REPORT", "MEDIA", "CASE"] as const;
export type ReviewEntityValue = (typeof REVIEW_ENTITIES)[number];
