import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/enums";
import { PERMISSIONS, can, type Permission } from "@/lib/permissions";

// Erwartete Mindestrolle je kritischer Berechtigung (Sicherheitsvertrag, docs/ARCHITECTURE.md §5)
const EXPECTED: Partial<Record<Permission, (typeof ROLES)[number]>> = {
  "case.read.public": "VISITOR",
  "hint.submit": "VISITOR",
  "submission.submit": "VISITOR",
  "account.own.read": "REPORTER",
  "admin.access": "MODERATOR",
  "hint.read": "MODERATOR",
  "hint.contact.read": "MODERATOR",
  "case.read.internal": "MODERATOR",
  "case.publish": "EDITOR",
  "case.urgent.set": "EDITOR",
  "case.status.change": "EDITOR",
  "media.manage": "EDITOR",
  "personal_data.erase": "ADMINISTRATOR",
  "user.manage": "ADMINISTRATOR",
  "audit.read": "ADMINISTRATOR",
};

describe("Rollenmatrix", () => {
  it("entspricht dem dokumentierten Sicherheitsvertrag", () => {
    for (const [perm, role] of Object.entries(EXPECTED)) {
      expect(PERMISSIONS[perm as Permission], perm).toBe(role);
    }
  });

  it("nicht angemeldete Besucher haben nur öffentliche Rechte", () => {
    const allowed = (Object.keys(PERMISSIONS) as Permission[]).filter((p) => can(null, p));
    expect(allowed.sort()).toEqual(["case.read.public", "hint.submit", "report.submit", "submission.submit"]);
  });

  it("Reporter haben keinen Zugriff auf Moderation oder Hinweise", () => {
    expect(can("REPORTER", "admin.access")).toBe(false);
    expect(can("REPORTER", "hint.read")).toBe(false);
    expect(can("REPORTER", "case.read.internal")).toBe(false);
  });

  it("Moderatoren dürfen weder veröffentlichen noch URGENT setzen", () => {
    expect(can("MODERATOR", "case.publish")).toBe(false);
    expect(can("MODERATOR", "case.urgent.set")).toBe(false);
    expect(can("MODERATOR", "case.status.change")).toBe(false);
    expect(can("MODERATOR", "hint.moderate")).toBe(true);
  });

  it("nur Administratoren verwalten Benutzer und sehen das Audit-Log", () => {
    for (const role of ROLES) {
      expect(can(role, "user.manage")).toBe(role === "ADMINISTRATOR");
      expect(can(role, "audit.read")).toBe(role === "ADMINISTRATOR");
    }
  });

  it("Rechte sind monoton (höhere Rolle ⊇ niedrigere Rolle)", () => {
    for (let i = 1; i < ROLES.length; i++) {
      for (const p of Object.keys(PERMISSIONS) as Permission[]) {
        if (can(ROLES[i - 1], p)) expect(can(ROLES[i], p)).toBe(true);
      }
    }
  });
});
