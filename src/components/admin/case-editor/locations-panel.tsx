"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { LOCATION_TYPES, type LocationTypeValue, type VisibilityValue } from "@/lib/enums";
import { FEDERAL_STATES } from "@/lib/federal-states";
import { formatDateTime } from "@/lib/format";
import { LOCATION_TYPE_LABELS } from "@/lib/labels";
import { Badge, Button } from "@/components/ui";
import { Field, FormError } from "@/components/ui/form";
import { formToJson } from "./util";

type Loc = {
  id: string;
  type: LocationTypeValue;
  label: string;
  latitude: number;
  longitude: number;
  precisionM: number;
  observedAt: Date | null;
  visibility: VisibilityValue;
  isConfirmed: boolean;
  source: { id: string; title: string } | null;
};

export function LocationsPanel({ caseId, locations, sources, canEdit }: { caseId: string; locations: Loc[]; sources: { id: string; title: string }[]; canEdit: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);

  async function run(path: string, init: Parameters<typeof api>[1]) {
    const res = await api(path, init);
    if (!res.ok) setError(res.error);
    else setError(null);
    router.refresh();
    return res.ok;
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (await run(`/api/admin/cases/${caseId}/locations`, { json: formToJson(form) })) form.reset();
  }

  return (
    <div className="space-y-4">
      <FormError error={error} />
      {locations.length ? (
        <ul className="space-y-2">
          {locations.map((l) => (
            <li key={l.id} className="flex flex-col gap-2 rounded-lg border border-line p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{LOCATION_TYPE_LABELS[l.type]}</span>
                  <Badge tone={l.visibility === "PUBLIC" ? "found" : "neutral"}>{l.visibility === "PUBLIC" ? "öffentlich (generalisiert)" : "intern"}</Badge>
                  {l.isConfirmed ? <Badge tone="brand">bestätigt</Badge> : <Badge>unbestätigt</Badge>}
                </div>
                <p>{l.label}</p>
                <p className="text-muted">
                  {l.latitude.toFixed(4)}, {l.longitude.toFixed(4)} · ±{l.precisionM} m{l.observedAt ? ` · ${formatDateTime(l.observedAt)}` : ""}{l.source ? ` · Quelle: ${l.source.title}` : ""}
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Button variant="secondary" className="min-h-[36px] py-1" onClick={() => run(`/api/admin/locations/${l.id}`, { method: "PATCH", json: { visibility: l.visibility === "PUBLIC" ? "INTERNAL" : "PUBLIC" } })}>
                    {l.visibility === "PUBLIC" ? "Intern machen" : "Veröffentlichen"}
                  </Button>
                  <Button variant="ghost" className="min-h-[36px] py-1" onClick={() => window.confirm("Ort löschen?") && run(`/api/admin/locations/${l.id}`, { method: "DELETE" })}>
                    Löschen
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Noch keine Orte erfasst.</p>
      )}
      {canEdit && (
        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold">Ort hinzufügen</summary>
          <p className="mt-2 text-xs text-muted">Nur Ortsebene (Stadtteil, Bahnhof, Park …) – keine Privatadressen. Öffentliche Orte werden auf ca. 1–2 km generalisiert.</p>
          <form onSubmit={add} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" noValidate>
            <Field label="Typ" required>{(p) => <select name="type" className="input" {...p}>{LOCATION_TYPES.map((t) => <option key={t} value={t}>{LOCATION_TYPE_LABELS[t]}</option>)}</select>}</Field>
            <Field label="Bezeichnung" required error={error?.details?.label}>{(p) => <input name="label" className="input" placeholder="z. B. Hagen, Innenstadt" {...p} />}</Field>
            <Field label="Ort" error={error?.details?.city}>{(p) => <input name="city" className="input" {...p} />}</Field>
            <Field label="Breitengrad" required error={error?.details?.latitude}>{(p) => <input name="latitude" type="number" step="0.0001" className="input" {...p} />}</Field>
            <Field label="Längengrad" required error={error?.details?.longitude}>{(p) => <input name="longitude" type="number" step="0.0001" className="input" {...p} />}</Field>
            <Field label="Genauigkeit (Meter, ≥ 100)" error={error?.details?.precisionM}>{(p) => <input name="precisionM" type="number" min={100} defaultValue={1000} className="input" {...p} />}</Field>
            <Field label="Bundesland">{(p) => <select name="federalState" className="input" {...p}><option value="">–</option>{FEDERAL_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select>}</Field>
            <Field label="Zeitpunkt" error={error?.details?.observedAt}>{(p) => <input name="observedAt" type="datetime-local" className="input" {...p} />}</Field>
            <Field label="Quelle">{(p) => <select name="sourceId" className="input" {...p}><option value="">–</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>}</Field>
            <Field label="Sichtbarkeit">{(p) => <select name="visibility" className="input" defaultValue="INTERNAL" {...p}><option value="INTERNAL">intern</option><option value="PUBLIC">öffentlich (generalisiert)</option></select>}</Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isConfirmed" /> bestätigter Ort</label>
            <div className="sm:col-span-2 lg:col-span-3"><Button type="submit" variant="secondary">Ort speichern</Button></div>
          </form>
        </details>
      )}
    </div>
  );
}
