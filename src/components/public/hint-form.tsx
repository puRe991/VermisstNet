"use client";

import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { HINT_TYPES } from "@/lib/enums";
import { HINT_TYPE_LABELS } from "@/lib/labels";
import { Alert, Button } from "@/components/ui";
import { Field, FormError, Honeypot } from "@/components/ui/form";

export function HintForm({ publicNumber }: { publicNumber: string }) {
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<{ referenceCode: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [anonymous, setAnonymous] = useState(true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("isAnonymous", anonymous ? "true" : "false");
    const res = await api<{ referenceCode: string }>(`/api/cases/${publicNumber}/hints`, { form: fd });
    setBusy(false);
    if (res.ok) {
      setResult(res.data);
      window.scrollTo({ top: 0 });
    } else setError(res.error);
  }

  if (result) {
    return (
      <Alert tone="found" title="Vielen Dank – Ihr Hinweis wurde übermittelt.">
        <p>
          Ihr Hinweis wird vertraulich vom Moderationsteam geprüft und <strong>nicht veröffentlicht</strong>. Ihre
          Referenznummer: <strong className="font-mono">{result.referenceCode}</strong>
        </p>
        <p className="mt-2">Bei akuter Gefahr oder wenn Sie die Person gerade sehen: Notruf 110.</p>
      </Alert>
    );
  }

  const d = error?.details ?? {};
  return (
    <form onSubmit={onSubmit} className="relative space-y-5" noValidate encType="multipart/form-data">
      <FormError error={error} />
      <Field label="Art des Hinweises" required error={d.hintType}>
        {(p) => (
          <select name="hintType" className="input" required defaultValue="PERSON_SEEN" {...p}>
            {HINT_TYPES.map((t) => (
              <option key={t} value={t}>{HINT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Beobachtungsdatum" error={d.observedDate}>
          {(p) => <input type="date" name="observedDate" className="input" max={new Date().toISOString().slice(0, 10)} {...p} />}
        </Field>
        <Field label="Uhrzeit (ungefähr)" error={d.observedTime}>
          {(p) => <input type="time" name="observedTime" className="input" {...p} />}
        </Field>
      </div>
      <Field label="Ort der Beobachtung" error={d.locationText} hint="z. B. „Hagen, Bushaltestelle am Hauptbahnhof“">
        {(p) => <input name="locationText" maxLength={300} className="input" {...p} />}
      </Field>
      <Field label="Beschreibung" required error={d.description} hint="Was haben Sie beobachtet? Kleidung, Begleitung, Fahrtrichtung … (mind. 10 Zeichen)">
        {(p) => <textarea name="description" rows={6} maxLength={5000} required className="input" {...p} />}
      </Field>
      <Field label="Fotos/Videos (optional, max. 3)" error={d.attachments} hint="JPG, PNG, WebP bis 8 MB; MP4/WebM bis 25 MB. Metadaten (z. B. GPS) werden bei Bildern entfernt.">
        {(p) => <input type="file" name="attachments" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="input" {...p} />}
      </Field>

      <fieldset className="space-y-3 rounded-lg border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Kontakt</legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-1" />
          <span>Hinweis anonym senden (kein Rückkontakt möglich, außer Sie geben freiwillig eine Kontaktmöglichkeit an)</span>
        </label>
        <Field label={anonymous ? "Kontaktmöglichkeit (optional)" : "Kontaktmöglichkeit"} required={!anonymous} error={d.contact} hint="Telefon oder E-Mail. Wird verschlüsselt gespeichert und nur vom Moderationsteam eingesehen.">
          {(p) => <input name="contact" maxLength={300} className="input" autoComplete="email" {...p} />}
        </Field>
      </fieldset>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" value="true" required className="mt-1" />
        <span>
          Ich habe die <a href="/datenschutz" target="_blank">Datenschutzhinweise</a> gelesen. Mir ist bewusst, dass mein
          Hinweis nicht veröffentlicht, sondern geprüft und ggf. an die zuständige Behörde weitergeleitet wird.
        </span>
      </label>
      {d.consent && <p className="text-sm text-danger">{d.consent.join(" ")}</p>}
      <Honeypot />
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? "Wird übermittelt …" : "Hinweis vertraulich senden"}
      </Button>
    </form>
  );
}
