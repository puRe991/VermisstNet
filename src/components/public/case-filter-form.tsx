import { FEDERAL_STATES } from "@/lib/federal-states";
import { GENDER_LABELS, SOURCE_TYPE_LABELS } from "@/lib/labels";
import { GENDERS, SOURCE_TYPES } from "@/lib/enums";

/** Filterformular per GET – funktioniert ohne JavaScript, Ergebnis ist teilbar (URL). */
export function CaseFilterForm({
  values,
  statuses,
  genders,
  action = "/faelle",
}: {
  values: Record<string, string>;
  statuses: readonly string[];
  genders: readonly string[];
  action?: string;
}) {
  return (
    <form action={action} method="get" className="space-y-4 rounded-xl border border-line bg-surface p-4" aria-label="Filter">
      <div>
        <label htmlFor="f-q" className="text-sm font-semibold">Suche</label>
        <input id="f-q" name="q" type="search" className="input mt-1" placeholder="Name, Ort, Fallnummer …" defaultValue={values.q ?? ""} />
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Status</legend>
        <div className="mt-1 space-y-1 text-sm">
          {[
            ["ACTIVE", "Aktive Suche"],
            ["FOUND", "Gefunden"],
            ["CLOSED", "Abgeschlossen"],
          ].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2">
              <input type="checkbox" name="status" value={v} defaultChecked={statuses.includes(v!)} /> {l}
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input type="checkbox" name="urgent" value="true" defaultChecked={values.urgent === "true"} /> nur dringende Fälle
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Geschlecht</legend>
        <div className="mt-1 grid grid-cols-2 gap-1 text-sm">
          {GENDERS.map((g) => (
            <label key={g} className="flex items-center gap-2">
              <input type="checkbox" name="gender" value={g} defaultChecked={genders.includes(g)} /> {GENDER_LABELS[g]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="f-amin" className="text-sm font-semibold">Alter von</label>
          <input id="f-amin" name="ageMin" type="number" min={0} max={130} inputMode="numeric" className="input mt-1" defaultValue={values.ageMin ?? ""} />
        </div>
        <div>
          <label htmlFor="f-amax" className="text-sm font-semibold">bis</label>
          <input id="f-amax" name="ageMax" type="number" min={0} max={130} inputMode="numeric" className="input mt-1" defaultValue={values.ageMax ?? ""} />
        </div>
      </div>
      <div>
        <label htmlFor="f-state" className="text-sm font-semibold">Bundesland</label>
        <select id="f-state" name="state" className="input mt-1" defaultValue={values.state ?? ""}>
          <option value="">Alle</option>
          {FEDERAL_STATES.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-city" className="text-sm font-semibold">Ort</label>
        <input id="f-city" name="city" className="input mt-1" defaultValue={values.city ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="f-since" className="text-sm font-semibold">Vermisst ab</label>
          <input id="f-since" name="since" type="date" className="input mt-1" defaultValue={values.since ?? ""} />
        </div>
        <div>
          <label htmlFor="f-until" className="text-sm font-semibold">bis</label>
          <input id="f-until" name="until" type="date" className="input mt-1" defaultValue={values.until ?? ""} />
        </div>
      </div>
      <div>
        <label htmlFor="f-src" className="text-sm font-semibold">Quelle</label>
        <select id="f-src" name="sourceType" className="input mt-1" defaultValue={values.sourceType ?? ""}>
          <option value="">Alle</option>
          {SOURCE_TYPES.map((s) => (
            <option key={s} value={s}>{SOURCE_TYPE_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="min-h-[44px] flex-1 rounded-lg bg-brand px-4 font-semibold text-white hover:bg-brand-strong">
          Anwenden
        </button>
        <a href={action} className="flex min-h-[44px] items-center rounded-lg border border-line px-4 text-sm no-underline">
          Zurücksetzen
        </a>
      </div>
    </form>
  );
}
