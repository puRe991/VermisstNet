/** Date → "YYYY-MM-DD" (für <input type="date">) */
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/** Date → "YYYY-MM-DDTHH:mm" in lokaler Zeit (für <input type="datetime-local">) */
export function toDateTimeInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/** FormData → Objekt; datetime-local-Werte werden als lokale Zeit mit Offset übertragen */
export function formToJson(form: HTMLFormElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const el of Array.from(form.elements) as HTMLInputElement[]) {
    if (!el.name || el.disabled) continue;
    if (el.type === "checkbox") out[el.name] = el.checked;
    else if (el.type === "datetime-local") out[el.name] = el.value ? new Date(el.value).toISOString() : "";
    else if (el.type !== "file" && el.type !== "submit" && el.type !== "button") out[el.name] = el.value;
  }
  return out;
}

export type CasePerms = {
  canEdit: boolean;
  canStatus: boolean;
  canPublish: boolean;
  canLocations: boolean;
  canCreateSource: boolean;
  canVerifySource: boolean;
  canDeleteSource: boolean;
  canTimeline: boolean;
  canDeleteTimeline: boolean;
  canMedia: boolean;
};
