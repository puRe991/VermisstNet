"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { TIMELINE_EVENT_TYPES, type TimelineEventTypeValue, type VisibilityValue } from "@/lib/enums";
import { formatDateTime } from "@/lib/format";
import { TIMELINE_EVENT_TYPE_LABELS } from "@/lib/labels";
import { Badge, Button } from "@/components/ui";
import { Field, FormError } from "@/components/ui/form";
import { formToJson } from "./util";

type Ev = {
  id: string;
  type: TimelineEventTypeValue;
  occurredAt: Date;
  description: string;
  visibility: VisibilityValue;
  createdBy: { displayName: string } | null;
  source: { id: string; title: string } | null;
  location: { id: string; label: string } | null;
};

export function TimelinePanel({
  caseId,
  events,
  sources,
  locations,
  canCreate,
  canDelete,
}: {
  caseId: string;
  events: Ev[];
  sources: { id: string; title: string }[];
  locations: { id: string; label: string }[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);

  async function run(path: string, init: Parameters<typeof api>[1]) {
    const res = await api(path, init);
    setError(res.ok ? null : res.error);
    router.refresh();
    return res.ok;
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (await run(`/api/admin/cases/${caseId}/timeline`, { json: formToJson(form) })) form.reset();
  }

  return (
    <div className="space-y-4">
      <FormError error={error} />
      {events.length ? (
        <ol className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="rounded-lg border border-line p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{formatDateTime(e.occurredAt)} · {TIMELINE_EVENT_TYPE_LABELS[e.type]}</span>
                <Badge tone={e.visibility === "PUBLIC" ? "found" : "neutral"}>{e.visibility === "PUBLIC" ? "öffentlich" : "intern"}</Badge>
              </div>
              <p className="mt-1 whitespace-pre-line">{e.description}</p>
              <p className="text-xs text-muted">
                {e.createdBy ? `Erstellt von ${e.createdBy.displayName}` : "System"}
                {e.source ? ` · Quelle: ${e.source.title}` : ""}
                {e.location ? ` · Ort: ${e.location.label}` : ""}
              </p>
              {canCreate && (
                <div className="mt-2 flex gap-2">
                  <Button variant="secondary" className="min-h-[36px] py-1" onClick={() => run(`/api/admin/timeline/${e.id}`, { method: "PATCH", json: { visibility: e.visibility === "PUBLIC" ? "INTERNAL" : "PUBLIC" } })}>
                    {e.visibility === "PUBLIC" ? "Intern machen" : "Veröffentlichen"}
                  </Button>
                  {canDelete && (
                    <Button variant="ghost" className="min-h-[36px] py-1" onClick={() => window.confirm("Ereignis löschen?") && run(`/api/admin/timeline/${e.id}`, { method: "DELETE" })}>
                      Löschen
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">Noch keine Ereignisse.</p>
      )}
      {canCreate && (
        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold">Ereignis hinzufügen</summary>
          <form onSubmit={add} className="mt-3 grid gap-3 sm:grid-cols-2" noValidate>
            <Field label="Typ" required>{(p) => <select name="type" className="input" {...p}>{TIMELINE_EVENT_TYPES.map((t) => <option key={t} value={t}>{TIMELINE_EVENT_TYPE_LABELS[t]}</option>)}</select>}</Field>
            <Field label="Zeitpunkt" required error={error?.details?.occurredAt}>{(p) => <input name="occurredAt" type="datetime-local" className="input" {...p} />}</Field>
            <Field label="Beschreibung" required error={error?.details?.description} className="sm:col-span-2">{(p) => <textarea name="description" rows={2} className="input" {...p} />}</Field>
            <Field label="Quelle">{(p) => <select name="sourceId" className="input" {...p}><option value="">–</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>}</Field>
            <Field label="Ort">{(p) => <select name="locationId" className="input" {...p}><option value="">–</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select>}</Field>
            <Field label="Sichtbarkeit">{(p) => <select name="visibility" className="input" defaultValue="INTERNAL" {...p}><option value="INTERNAL">intern</option><option value="PUBLIC">öffentlich</option></select>}</Field>
            <div className="sm:col-span-2"><Button type="submit" variant="secondary">Ereignis speichern</Button></div>
          </form>
        </details>
      )}
    </div>
  );
}
