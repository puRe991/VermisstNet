import type { RoleValue } from "./enums";

/** Rollen-Hierarchie: höhere Rollen erben alle Rechte niedrigerer Rollen. */
export const ROLE_RANK: Record<RoleValue, number> = {
  VISITOR: 0,
  REPORTER: 1,
  MODERATOR: 2,
  EDITOR: 3,
  ADMINISTRATOR: 4,
};

/**
 * Berechtigungen und die jeweils benötigte Mindestrolle.
 * Maßgebliche Definition – siehe docs/ARCHITECTURE.md §5. Änderungen nur mit Test-Anpassung.
 */
export const PERMISSIONS = {
  // öffentlich
  "case.read.public": "VISITOR",
  "hint.submit": "VISITOR",
  "submission.submit": "VISITOR",
  "report.submit": "VISITOR",
  // eigenes Konto
  "account.own.read": "REPORTER",
  // Moderation
  "admin.access": "MODERATOR",
  "case.read.internal": "MODERATOR",
  "hint.read": "MODERATOR",
  "hint.moderate": "MODERATOR",
  "hint.contact.read": "MODERATOR",
  "submission.read": "MODERATOR",
  "submission.moderate": "MODERATOR",
  "source.create": "MODERATOR",
  "source.update": "MODERATOR",
  "source.verify": "MODERATOR",
  "timeline.create": "MODERATOR",
  "timeline.update": "MODERATOR",
  "report.moderate": "MODERATOR",
  "media.read.internal": "MODERATOR",
  // Redaktion
  "case.create": "EDITOR",
  "case.update": "EDITOR",
  "case.status.change": "EDITOR",
  "case.urgent.set": "EDITOR",
  "case.publish": "EDITOR",
  "location.manage": "EDITOR",
  "source.delete": "EDITOR",
  "timeline.delete": "EDITOR",
  "media.upload": "EDITOR",
  "media.manage": "EDITOR",
  // Administration
  "personal_data.erase": "ADMINISTRATOR",
  "user.manage": "ADMINISTRATOR",
  "audit.read": "ADMINISTRATOR",
} as const satisfies Record<string, RoleValue>;

export type Permission = keyof typeof PERMISSIONS;

export function hasRole(role: RoleValue | null | undefined, minimum: RoleValue): boolean {
  const effective = role ?? "VISITOR";
  return ROLE_RANK[effective] >= ROLE_RANK[minimum];
}

/** role = null → nicht angemeldeter Besucher */
export function can(role: RoleValue | null | undefined, permission: Permission): boolean {
  return hasRole(role, PERMISSIONS[permission]);
}
