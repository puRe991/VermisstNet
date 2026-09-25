"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { GENDERS, PRIVACY_LEVELS, type GenderValue, type PrivacyLevelValue } from "@/lib/enums";
import { FEDERAL_STATES } from "@/lib/federal-states";
import { GENDER_LABELS, PRIVACY_LEVEL_LABELS } from "@/lib/labels";
import { Alert, Button } from "@/components/ui";
import { Field, FormError } from "@/components/ui/form";
import { formToJson, toDateInput, toDateTimeInput } from "./util";

export type CaseFormValues = {
  person: {
    firstName: string;
    lastName: string | null;
    birthDate: Date | string | null;
    ageAtMissing: number | null;
    gender: GenderValue;
    heightCm: number | null;
    build: string | null;
    hairColor: string | null;
    eyeColor: string | null;
    distinguishingFeatures: string | null;
    description: string | null;
    privacyLevel: PrivacyLevelValue;
  };
  missingSince: Date | string;
  missingPlace: string;
  lastKnownPlace: string | null;
  city: string | null;
  federalState: string | null;
  circumstances: string | null;
  clothing: string | null;
  responsibleAuthority: string | null;
  authorityContact: string | null;
  internalReference: string | null;
  internalNotes: string | null;
};

const PERSON_KEYS = ["firstName", "lastName", "birthDate", "ageAtMissing", "gender", "heightCm", "build", "hairColor", "eyeColor", "distinguishingFeatures", "description", "privacyLevel"];

export function CaseForm({ mode, caseId, initial, readOnly }: { mode: "create" | "edit"; caseId?: string; initial?: CaseFormValues; readOnly?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = initial?.person;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const raw = formToJson(e.currentTarget);
    const person: Record<string, unknown> = {};
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith("person.")) {
        const key = k.slice(7);
        if (PERSON_KEYS.includes(key)) person[key] = v;
      } else body[k] = v;
    }
    body.person = person;
    const res =
      mode === "create"
        ? await api<{ id: string }>("/api/admin/cases", { json: body })
        : await api<{ id: string }>(`/api/admin/cases/${caseId}`, { method: "PATCH", json: body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    if (mode === "create") router.push(`/admin/faelle/${res.data.id}`);
    else {
      setSaved(true);
      router.refresh();
    }
  }

  const d = error?.details ?? {};
  const pe = (k: string) => d[`person.${k}`];

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormError error={error} />
      {saved && <Alert tone="found" title="Gespeichert" />}
      <fieldset disabled={readOnly} className="space-y-6">
        <section>
          <h3 className="mb-3 font-semibold">Person</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Vorname" required error={pe("firstName")}>{(x) => <input name="person.firstName" className="input" defaultValue={p?.firstName ?? ""} {...x} />}</Field>
            <Field label="Nachname" error={pe("lastName")}>{(x) => <input name="person.lastName" className="input" defaultValue={p?.lastName ?? ""} {...x} />}</Field>
            <Field label="Öffentliche Namensanzeige" required error={pe("privacyLevel")} hint="Bei Minderjährigen i. d. R. „Vorname + Initial“">
              {(x) => (
                <select name="person.privacyLevel" className="input" defaultValue={p?.privacyLevel ?? "FIRST_NAME_INITIAL"} {...x}>
                  {PRIVACY_LEVELS.map((l) => <option key={l} value={l}>{PRIVACY_LEVEL_LABELS[l]}</option>)}
                </select>
              )}
            </Field>
            <Field label="Geburtsdatum (intern)" error={pe("birthDate")} hint="Wird nie veröffentlicht, nur das Alter">{(x) => <input type="date" name="person.birthDate" className="input" defaultValue={toDateInput(p?.birthDate)} {...x} />}</Field>
            <Field label="Alter (falls Geburtsdatum unbekannt)" error={pe("ageAtMissing")}>{(x) => <input type="number" min={0} max={130} name="person.ageAtMissing" className="input" defaultValue={p?.ageAtMissing ?? ""} {...x} />}</Field>
            <Field label="Geschlecht" required error={pe("gender")}>
              {(x) => (
                <select name="person.gender" className="input" defaultValue={p?.gender ?? "UNKNOWN"} {...x}>
                  {GENDERS.map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
                </select>
              )}
            </Field>
            <Field label="Körpergröße (cm)" error={pe("heightCm")}>{(x) => <input type="number" min={30} max={260} name="person.heightCm" className="input" defaultValue={p?.heightCm ?? ""} {...x} />}</Field>
            <Field label="Statur" error={pe("build")}>{(x) => <input name="person.build" className="input" defaultValue={p?.build ?? ""} {...x} />}</Field>
            <Field label="Haarfarbe" error={pe("hairColor")}>{(x) => <input name="person.hairColor" className="input" defaultValue={p?.hairColor ?? ""} {...x} />}</Field>
            <Field label="Augenfarbe" error={pe("eyeColor")}>{(x) => <input name="person.eyeColor" className="input" defaultValue={p?.eyeColor ?? ""} {...x} />}</Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Besondere Merkmale" error={pe("distinguishingFeatures")}>{(x) => <textarea name="person.distinguishingFeatures" rows={2} className="input" defaultValue={p?.distinguishingFeatures ?? ""} {...x} />}</Field>
            <Field label="Weitere Beschreibung" error={pe("description")}>{(x) => <textarea name="person.description" rows={2} className="input" defaultValue={p?.description ?? ""} {...x} />}</Field>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Fall</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Vermisst seit" required error={d.missingSince}>{(x) => <input type="datetime-local" name="missingSince" className="input" defaultValue={toDateTimeInput(initial?.missingSince)} {...x} />}</Field>
            <Field label="Vermisstenort" required error={d.missingPlace} hint="Ort/Stadtteil, keine Adresse">{(x) => <input name="missingPlace" className="input" defaultValue={initial?.missingPlace ?? ""} {...x} />}</Field>
            <Field label="Letzter bestätigter Aufenthaltsort" error={d.lastKnownPlace}>{(x) => <input name="lastKnownPlace" className="input" defaultValue={initial?.lastKnownPlace ?? ""} {...x} />}</Field>
            <Field label="Ort (für Filter)" error={d.city}>{(x) => <input name="city" className="input" defaultValue={initial?.city ?? ""} {...x} />}</Field>
            <Field label="Bundesland" error={d.federalState}>
              {(x) => (
                <select name="federalState" className="input" defaultValue={initial?.federalState ?? ""} {...x}>
                  <option value="">–</option>
                  {FEDERAL_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              )}
            </Field>
            <Field label="Zuständige Stelle" error={d.responsibleAuthority}>{(x) => <input name="responsibleAuthority" className="input" defaultValue={initial?.responsibleAuthority ?? ""} {...x} />}</Field>
            <Field label="Öffentlicher Kontakt der Stelle" error={d.authorityContact}>{(x) => <input name="authorityContact" className="input" defaultValue={initial?.authorityContact ?? ""} {...x} />}</Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Beschreibung der Umstände (öffentlich)" error={d.circumstances}>{(x) => <textarea name="circumstances" rows={4} className="input" defaultValue={initial?.circumstances ?? ""} {...x} />}</Field>
            <Field label="Bekleidung" error={d.clothing}>{(x) => <textarea name="clothing" rows={4} className="input" defaultValue={initial?.clothing ?? ""} {...x} />}</Field>
          </div>
        </section>

        <section className="rounded-lg border border-warn/40 bg-warn-soft/40 p-4">
          <h3 className="mb-3 font-semibold">Intern (nie öffentlich)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Interne Referenz / Aktenzeichen" error={d.internalReference}>{(x) => <input name="internalReference" className="input" defaultValue={initial?.internalReference ?? ""} {...x} />}</Field>
            <Field label="Interne Notizen" error={d.internalNotes}>{(x) => <textarea name="internalNotes" rows={3} className="input" defaultValue={initial?.internalNotes ?? ""} {...x} />}</Field>
          </div>
        </section>
        {mode === "create" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isDemo" /> Als DEMO DATA kennzeichnen (nur fiktive Personen)
          </label>
        )}
      </fieldset>
      {!readOnly && <Button type="submit" disabled={busy}>{busy ? "Speichert …" : mode === "create" ? "Fallentwurf anlegen" : "Änderungen speichern"}</Button>}
    </form>
  );
}
