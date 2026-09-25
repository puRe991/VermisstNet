"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LazyMap, type MapMarker } from "@/components/map/lazy-map";
import { api } from "@/lib/api-client";
import { GENDERS, SOURCE_TYPES } from "@/lib/enums";
import { FEDERAL_STATES } from "@/lib/federal-states";
import { formatDate } from "@/lib/format";
import { GENDER_LABELS, SOURCE_TYPE_LABELS } from "@/lib/labels";
import type { PublicMapMarker } from "@/server/dto/public";

type Filters = {
  state: string;
  gender: string;
  ageMin: string;
  ageMax: string;
  urgent: string;
  since: string;
  until: string;
  sourceType: string;
};

const EMPTY: Filters = { state: "", gender: "", ageMin: "", ageMax: "", urgent: "", since: "", until: "", sourceType: "" };

export function MapExplorer() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [onlyView, setOnlyView] = useState(false);
  const [bbox, setBbox] = useState<string | null>(null);
  const [data, setData] = useState<{ items: PublicMapMarker[]; truncated: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  // Kartenbewegungen lösen nur dann neue Abfragen aus, wenn "nur Ausschnitt" aktiv ist
  const effectiveBbox = onlyView ? bbox : null;

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    if (effectiveBbox) params.set("bbox", effectiveBbox);
    const id = ++requestId.current;
    setLoading(true);
    const res = await api<{ items: PublicMapMarker[]; truncated: boolean }>(`/api/map/cases?${params.toString()}`);
    if (id !== requestId.current) return; // veraltete Antwort ignorieren
    setLoading(false);
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else setError(res.error.message);
  }, [filters, effectiveBbox]);

  useEffect(() => {
    const t = setTimeout(load, 250); // Entprellen bei Kartenbewegung/Filtereingabe
    return () => clearTimeout(t);
  }, [load]);

  const markers = useMemo<MapMarker[]>(
    () =>
      (data?.items ?? []).map((m) => ({
        id: m.publicNumber,
        lat: m.lat,
        lng: m.lng,
        urgent: m.isUrgent,
        label: m.displayName ?? m.headline,
        popup: {
          title: m.displayName ?? m.headline,
          subtitle: m.displayName ? m.headline : null,
          imageUrl: m.thumbUrl,
          imageAlt: `Suchbild: ${m.displayName ?? m.headline}`,
          lines: [
            ["Alter", m.age !== null ? `${m.age} Jahre` : "unbekannt"],
            ["Ort", m.place],
            ["Vermisst seit", formatDate(m.missingSince)],
            ["Status", m.isUrgent ? "Dringend – aktive Suche" : "Aktive Vermisstensuche"],
          ],
          note: `Ungefährer Bereich${m.isDemo ? " · DEMO DATA" : ""}`,
          href: `/faelle/${m.publicNumber}`,
          linkLabel: "Fall öffnen",
        },
      })),
    [data],
  );

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <form className="space-y-3 rounded-xl border border-line bg-surface p-4 text-sm" onSubmit={(e) => e.preventDefault()} aria-label="Kartenfilter">
        <div>
          <label htmlFor="m-state" className="font-semibold">Region (Bundesland)</label>
          <select id="m-state" className="input mt-1" value={filters.state} onChange={set("state")}>
            <option value="">Alle</option>
            {FEDERAL_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="m-amin" className="font-semibold">Alter von</label>
            <input id="m-amin" type="number" min={0} max={130} className="input mt-1" value={filters.ageMin} onChange={set("ageMin")} />
          </div>
          <div>
            <label htmlFor="m-amax" className="font-semibold">bis</label>
            <input id="m-amax" type="number" min={0} max={130} className="input mt-1" value={filters.ageMax} onChange={set("ageMax")} />
          </div>
        </div>
        <div>
          <label htmlFor="m-gender" className="font-semibold">Geschlecht</label>
          <select id="m-gender" className="input mt-1" value={filters.gender} onChange={set("gender")}>
            <option value="">Alle</option>
            {GENDERS.map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="m-status" className="font-semibold">Status</label>
          <select id="m-status" className="input mt-1" value={filters.urgent} onChange={set("urgent")}>
            <option value="">Alle aktiven Fälle</option>
            <option value="true">Nur dringende Fälle</option>
          </select>
          <p className="mt-1 text-xs text-muted">Gefundene Personen werden nicht auf der Karte angezeigt.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="m-since" className="font-semibold">Zeitraum ab</label>
            <input id="m-since" type="date" className="input mt-1" value={filters.since} onChange={set("since")} />
          </div>
          <div>
            <label htmlFor="m-until" className="font-semibold">bis</label>
            <input id="m-until" type="date" className="input mt-1" value={filters.until} onChange={set("until")} />
          </div>
        </div>
        <div>
          <label htmlFor="m-src" className="font-semibold">Quelle</label>
          <select id="m-src" className="input mt-1" value={filters.sourceType} onChange={set("sourceType")}>
            <option value="">Alle</option>
            {SOURCE_TYPES.map((s) => <option key={s} value={s}>{SOURCE_TYPE_LABELS[s]}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyView} onChange={(e) => setOnlyView(e.target.checked)} /> Nur aktuellen Kartenausschnitt laden
        </label>
        <button type="button" onClick={() => setFilters(EMPTY)} className="min-h-[44px] w-full rounded-lg border border-line font-semibold">
          Filter zurücksetzen
        </button>
      </form>
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted" aria-live="polite">
          <span>
            {loading ? "Lädt …" : `${data?.items.length ?? 0} Fälle auf der Karte`}
            {data?.truncated ? " (Anzeige begrenzt – bitte Filter verwenden)" : ""}
          </span>
          <span>Positionen sind bewusst ungenau (ca. 1–2 km).</span>
        </div>
        {error && <p className="mb-2 text-sm text-danger" role="alert">{error}</p>}
        <LazyMap
          markers={markers}
          cluster
          fit={!onlyView}
          onViewChange={setBbox}
          className="h-[65vh] min-h-[420px] w-full rounded-xl border border-line"
          ariaLabel="Karte der aktiven Vermisstenfälle"
        />
      </div>
    </div>
  );
}
