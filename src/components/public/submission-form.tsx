"use client";

import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { GENDERS } from "@/lib/enums";
import { GENDER_LABELS } from "@/lib/labels";
import { Alert, Button } from "@/components/ui";
import { Field, FormError, Honeypot } from "@/components/ui/form";

export function SubmissionForm() {
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<{ referenceCode: string; status: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ referenceCode: string; status: string }>("/api/cases/submissions", { form: new FormData(e.currentTarget) });
    setBusy(false);
    if (res.ok) {
      setResult(res.data);
      window.scrollTo({ top: 0 });
    } else setError(res.error);
  }

  if (result) {
    return (
      <Alert tone="found" title={`Meldung eingegangen – Status: ${result.status}`}>
        <p>
          Vielen Dank. Ihre Meldung wird geprüft, bevor sie – nach Quellenprüfung – möglicherweise veröffentlicht wird.
          Sie erscheint <strong>nicht automatisch</strong> öffentlich. Referenznummer:{" "}
          <strong className="font-mono">{result.referenceCode}</strong>
        </p>
        <p className="mt-2">Haben Sie bereits die Polizei informiert? Eine Vermisstenanzeige erstatten Sie bei jeder Polizeidienststelle.</p>
      </Alert>
    );
  }

  const d = error?.details ?? {};
  return (
    <form onSubmit={onSubmit} className="relative space-y-5" noValidate encType="multipart/form-data">
      <FormError error={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name der vermissten Person" required error={d.personName} className="sm:col-span-2">
          {(p) => <input name="personName" maxLength={120} required className="input" {...p} />}
        </Field>
        <Field label="Alter" error={d.age}>
          {(p) => <input name="age" type="number" min={0} max={120} inputMode="numeric" className="input" {...p} />}
        </Field>
        <Field label="Geschlecht" error={d.gender}>
          {(p) => (
            <select name="gender" className="input" defaultValue="UNKNOWN" {...p}>
              {GENDERS.map((g) => (
                <option key={g} value={g}>{GENDER_LABELS[g]}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Vermisst seit" required error={d.missingSince}>
          {(p) => <input name="missingSince" type="date" required className="input" max={new Date().toISOString().slice(0, 10)} {...p} />}
        </Field>
        <Field label="Vermisstenort" required error={d.missingPlace} hint="Ort/Stadtteil – bitte keine genaue Adresse">
          {(p) => <input name="missingPlace" maxLength={160} required className="input" {...p} />}
        </Field>
      </div>
      <Field label="Personenbeschreibung" error={d.description} hint="Größe, Statur, Haare, Kleidung, besondere Merkmale">
        {(p) => <textarea name="description" rows={4} maxLength={3000} className="input" {...p} />}
      </Field>
      <Field label="Bekannte Umstände" error={d.circumstances}>
        {(p) => <textarea name="circumstances" rows={4} maxLength={5000} className="input" {...p} />}
      </Field>
      <Field label="Suchbild (optional)" error={d.image ?? d.file} hint="JPG, PNG oder WebP bis 8 MB. Nur Bilder, für die eine Veröffentlichung erlaubt ist. Metadaten werden entfernt.">
        {(p) => <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="input" {...p} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quelle" required error={d.sourceText} hint="z. B. „Pressemitteilung der Polizei Hagen“ oder „Angehörige“">
          {(p) => <input name="sourceText" maxLength={500} required className="input" {...p} />}
        </Field>
        <Field label="Link zur Quelle" error={d.sourceUrl}>
          {(p) => <input name="sourceUrl" type="url" maxLength={2000} placeholder="https://" className="input" {...p} />}
        </Field>
      </div>
      <Field label="Ihre Kontaktmöglichkeit" error={d.contact} hint="Für Rückfragen des Moderationsteams. Wird verschlüsselt gespeichert und nie veröffentlicht.">
        {(p) => <input name="contact" maxLength={300} className="input" {...p} />}
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" value="true" required className="mt-1" />
        <span>
          Ich habe die <a href="/datenschutz" target="_blank">Datenschutzhinweise</a> gelesen und bestätige, dass meine
          Angaben nach bestem Wissen korrekt sind.
        </span>
      </label>
      {d.consent && <p className="text-sm text-danger">{d.consent.join(" ")}</p>}
      <Honeypot />
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? "Wird übermittelt …" : "Meldung zur Prüfung einreichen"}
      </Button>
    </form>
  );
}
